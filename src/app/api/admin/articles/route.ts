import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ApiError, qs, resolveCategoryId, resolveCityId, withAdminApi } from "@/lib/admin-api";
import { entitiesIn, findAndImport } from "@/lib/open-images";
import { saveArticle } from "@/app/admin/articles/actions";
import { importImageFromUrl } from "@/lib/media-import";

export const dynamic = "force-dynamic";
// Photo imports, ingestion and sends take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

/** GET /api/admin/articles?status=published|draft|scheduled|all&kind=news|guide&q=&limit= */
export const GET = withAdminApi(async (req) => {
  const q = qs(req);
  const status = q.str("status", "all")!;
  const kind = q.str("kind");
  const text = q.str("q");
  const db = await getDb();
  const conds = [];
  if (status !== "all") conds.push(eq(schema.articles.status, status as (typeof schema.articleStatus.enumValues)[number]));
  if (kind) conds.push(eq(schema.articles.kind, kind as (typeof schema.articleKind.enumValues)[number]));
  if (text) conds.push(sql`${schema.articles.title} ilike ${"%" + text + "%"}`);
  const rows = await db.query.articles.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: [desc(schema.articles.updatedAt)],
    limit: q.int("limit", 50, 200),
    columns: { id: true, kind: true, slug: true, title: true, dek: true, status: true, publishedAt: true, scheduledFor: true, updatedAt: true, featuredImageUrl: true },
    with: { category: { columns: { slug: true, name: true } } },
  });
  return { articles: rows.map((a) => ({ ...a, url: `/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}` })) };
});

const Body = z.object({
  id: z.string().optional(),
  kind: z.enum(["news", "guide"]),
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().max(120).optional(),
  dek: z.string().trim().max(400).optional(),
  /** Markdown. */
  body: z.string().min(20).max(200_000),
  category: z.string().trim().min(1),
  city: z.string().trim().optional(),
  entities: z.array(z.string()).max(12).default([]),
  tags: z.array(z.string()).max(12).default([]),
  sources: z.array(z.object({ title: z.string().min(1), url: z.string().url().optional(), publisher: z.string().optional() })).max(20).default([]),
  faqs: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).max(10).default([]),
  seoTitle: z.string().trim().max(120).optional(),
  seoDescription: z.string().trim().max(200).optional(),
  featured: z.boolean().optional(),
  /**
   * Photo: either an already uploaded URL, a remote openly licensed URL with its credit, or a search query
   * ("petrol pump Lahore") that picks the first usable openly licensed photo, after trying the Wikipedia
   * photo of any named entity. Omit to keep the current one.
   */
  image: z
    .union([
      z.object({ url: z.string().url(), alt: z.string().max(300).optional(), credit: z.string().max(200).optional(), sourceUrl: z.string().url().optional(), license: z.string().max(40).optional() }),
      z.object({
        query: z.string().min(2).max(120),
        alt: z.string().max(300).optional(),
        fallbackQuery: z.string().max(120).optional(),
        /** Named people, teams, bodies or places the story is about, e.g. ["Babar Azam", "Gaddafi Stadium"]: their Wikipedia lead photo is tried first. Defaults to the capitalised names in the title. */
        entities: z.array(z.string().min(2).max(80)).max(4).optional(),
      }),
    ])
    .optional(),
  /** publish now (default), schedule at `scheduledFor` (ISO, Asia/Karachi offset allowed), or save as draft. */
  intent: z.enum(["publish", "schedule", "draft"]).default("publish"),
  scheduledFor: z.string().optional(),
  note: z.string().max(300).optional(),
});

/** POST /api/admin/articles: create or update (pass `id` or an existing `slug` of the same kind to update). */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  const db = await getDb();
  const [categoryId, locationId] = await Promise.all([resolveCategoryId(d.kind, d.category), resolveCityId(d.city)]);
  // Update by slug when no id is given and the slug already exists for that kind.
  const existing = d.id
    ? await db.query.articles.findFirst({ where: eq(schema.articles.id, d.id) })
    : d.slug
      ? await db.query.articles.findFirst({ where: and(eq(schema.articles.kind, d.kind), eq(schema.articles.slug, d.slug)) })
      : undefined;
  if (d.id && !existing) throw new ApiError(404, `No article with id ${d.id}`);

  let imageFields: { featuredImageUrl?: string; featuredImageAlt?: string; featuredImageCredit?: string; featuredImageSourceUrl?: string } = existing
    ? { featuredImageUrl: existing.featuredImageUrl ?? undefined, featuredImageAlt: existing.featuredImageAlt ?? undefined, featuredImageCredit: existing.featuredImageCredit ?? undefined, featuredImageSourceUrl: existing.featuredImageSourceUrl ?? undefined }
    : {};
  let imageNote: string | undefined;
  if (d.image && "query" in d.image) {
    const img = await findAndImport(d.image.query, "article", d.image.alt ?? d.title, { fallbackQuery: d.image.fallbackQuery, budgetMs: 25_000, entities: d.image.entities ?? entitiesIn(d.title) });
    if (img) imageFields = { featuredImageUrl: img.url, featuredImageAlt: d.image.alt ?? d.title, featuredImageCredit: img.credit, featuredImageSourceUrl: img.sourceUrl };
    else imageNote = `No openly licensed photo found for "${d.image.query}" right now; the photo backfill job will try again over the next days`;
  } else if (d.image && "url" in d.image) {
    if (d.image.url.startsWith(process.env.R2_PUBLIC_URL ?? "https://img.searchable.pk")) {
      imageFields = { featuredImageUrl: d.image.url, featuredImageAlt: d.image.alt, featuredImageCredit: d.image.credit, featuredImageSourceUrl: d.image.sourceUrl };
    } else {
      const img = await importImageFromUrl(d.image.url, { variant: "article", alt: d.image.alt ?? d.title, credit: d.image.credit, sourceUrl: d.image.sourceUrl, license: d.image.license });
      imageFields = { featuredImageUrl: img.url, featuredImageAlt: d.image.alt ?? d.title, featuredImageCredit: d.image.credit, featuredImageSourceUrl: d.image.sourceUrl };
    }
  }

  const result = await saveArticle({
    id: existing?.id,
    kind: d.kind,
    title: d.title,
    // A title edit must never move the page: updates keep the slug unless one is given explicitly.
    slug: d.slug ?? existing?.slug,
    dek: d.dek,
    body: d.body,
    categoryId,
    locationId,
    ...imageFields,
    seoTitle: d.seoTitle,
    seoDescription: d.seoDescription,
    isFeatured: d.featured,
    sources: d.sources,
    faqs: d.faqs,
    entitySlugs: d.entities,
    tags: d.tags,
    relatedIds: [],
    intent: d.intent === "draft" ? "save" : d.intent,
    workflow: d.intent === "draft" ? "draft" : undefined,
    scheduledFor: d.scheduledFor,
    note: d.note ?? "Via admin API",
  });
  if (!result.ok) throw new ApiError(400, result.error ?? "Could not save");
  const saved = await db.query.articles.findFirst({ where: eq(schema.articles.id, result.id!), columns: { id: true, kind: true, slug: true, status: true, publishedAt: true, scheduledFor: true, featuredImageUrl: true }, with: { category: { columns: { slug: true } } } });
  return {
    ok: true,
    id: saved!.id,
    status: saved!.status,
    url: `/${saved!.kind === "news" ? "news" : "guides"}/${saved!.category?.slug ?? "general"}/${saved!.slug}`,
    image: saved!.featuredImageUrl,
    ...(imageNote ? { note: imageNote } : {}),
  };
});
