import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ApiError, withAdminApi } from "@/lib/admin-api";
import { importImageFromUrl } from "@/lib/media-import";
import { entitiesIn, findAndImport } from "@/lib/open-images";
import { removeSearchDocument } from "@/lib/search";
import { saveArticle } from "@/app/admin/articles/actions";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const db = await getDb();
  const a = await db.query.articles.findFirst({ where: eq(schema.articles.id, id), with: { category: { columns: { slug: true, name: true } }, location: { columns: { slug: true, name: true } } } });
  if (!a) throw new ApiError(404, "No such article");
  const links = await db.query.entityLinks.findMany({ where: and(eq(schema.entityLinks.targetType, "article"), eq(schema.entityLinks.targetId, id)), with: { entity: { columns: { slug: true } } } });
  const tags = await db.query.articleTags.findMany({ where: eq(schema.articleTags.articleId, id), with: { tag: { columns: { name: true } } } });
  return { ...a, entities: links.map((l) => l.entity?.slug).filter(Boolean), tags: tags.map((t) => t.tag?.name).filter(Boolean), url: `/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}` };
}

/** GET /api/admin/articles/[id]: the full article (markdown body, sources, faqs, image, entities, tags). */
export const GET = withAdminApi<{ id: string }>(async (_req, { params }) => ({ article: await load(params.id) }));

const Patch = z.object({
  intent: z.enum(["publish", "unpublish", "schedule"]).optional(),
  scheduledFor: z.string().optional(),
  /** Move the story to a new address; the old one redirects. */
  slug: z.string().trim().min(3).max(120).optional(),
  /** Replace the photo only: a URL (ours or an openly licensed remote file with its credit) or a search, as on POST; `null` removes it. */
  image: z
    .union([
      z.null(),
      z
        .object({ url: z.string().url(), alt: z.string().max(300).optional(), credit: z.string().max(200).optional(), sourceUrl: z.string().url().optional(), license: z.string().max(40).optional() })
        // An outside photo must say where it came from and who to credit (ADR-51); our own host needs neither.
        .refine((i) => i.url.startsWith(process.env.R2_PUBLIC_URL ?? "https://img.searchable.pk") || (!!i.credit && !!i.sourceUrl), { message: "image.url from another host needs credit and sourceUrl (the page the photo was taken from)" }),
      z.object({ query: z.string().min(2).max(120), alt: z.string().max(300).optional(), fallbackQuery: z.string().max(120).optional(), entities: z.array(z.string().min(2).max(80)).max(4).optional() }),
    ])
    .optional(),
  note: z.string().max(300).optional(),
});

export const maxDuration = 60;

/**
 * PATCH /api/admin/articles/[id] { intent: publish | unpublish | schedule, scheduledFor } changes status;
 * { image: { url | query } } swaps the photo; { slug } moves the story and leaves a redirect. Everything else,
 * including the current status, is kept.
 */
export const PATCH = withAdminApi<{ id: string }>(async (_req, { params, body }) => {
  const d = Patch.parse(body);
  if (!d.intent && d.image === undefined && !d.slug) throw new ApiError(400, "Give an intent, an image (or null to remove it) or a slug");
  const a = await load(params.id);
  let image = { featuredImageUrl: a.featuredImageUrl ?? undefined, featuredImageAlt: a.featuredImageAlt ?? undefined, featuredImageCredit: a.featuredImageCredit ?? undefined, featuredImageSourceUrl: a.featuredImageSourceUrl ?? undefined };
  let imageNote: string | undefined;
  if (d.image === null) {
    // A wrong or inappropriate photo comes off at once; the story stands without one (ADR-51).
    image = { featuredImageUrl: undefined, featuredImageAlt: undefined, featuredImageCredit: undefined, featuredImageSourceUrl: undefined };
  } else if (d.image && "query" in d.image) {
    const img = await findAndImport(d.image.query, "article", d.image.alt ?? a.title, { fallbackQuery: d.image.fallbackQuery, budgetMs: 25_000, entities: d.image.entities ?? entitiesIn(a.title), headline: a.title, strict: a.kind === "news" });
    if (img) image = { featuredImageUrl: img.url, featuredImageAlt: d.image.alt ?? a.title, featuredImageCredit: img.credit, featuredImageSourceUrl: img.sourceUrl };
    else imageNote = `No openly licensed photo describes "${d.image.query}" well enough (ADR-51); the photo is unchanged`;
  } else if (d.image && "url" in d.image) {
    if (d.image.url.startsWith(process.env.R2_PUBLIC_URL ?? "https://img.searchable.pk")) {
      image = { featuredImageUrl: d.image.url, featuredImageAlt: d.image.alt ?? a.title, featuredImageCredit: d.image.credit, featuredImageSourceUrl: d.image.sourceUrl };
    } else {
      const img = await importImageFromUrl(d.image.url, { variant: "article", alt: d.image.alt ?? a.title, credit: d.image.credit, sourceUrl: d.image.sourceUrl, license: d.image.license });
      image = { featuredImageUrl: img.url, featuredImageAlt: d.image.alt ?? a.title, featuredImageCredit: d.image.credit, featuredImageSourceUrl: d.image.sourceUrl };
    }
  }
  // Without an intent the status stays: a scheduled story stays scheduled, a published one stays published.
  const intent = d.intent ?? (a.status === "published" ? "publish" : a.status === "scheduled" ? "schedule" : "unpublish");
  const result = await saveArticle({
    id: a.id,
    kind: a.kind,
    title: a.title,
    slug: d.slug ?? a.slug,
    dek: a.dek ?? undefined,
    body: a.body,
    categoryId: a.categoryId ?? undefined,
    authorId: a.authorId ?? undefined,
    locationId: a.locationId ?? undefined,
    ...image,
    seoTitle: a.seoTitle ?? undefined,
    seoDescription: a.seoDescription ?? undefined,
    isFeatured: a.isFeatured,
    noindex: a.noindex,
    sources: (a.sources ?? []) as { title: string; url?: string; publisher?: string }[],
    faqs: (a.faqs ?? []) as { question: string; answer: string }[],
    entitySlugs: a.entities as string[],
    tags: a.tags as string[],
    relatedIds: (a.relatedIds ?? []) as string[],
    intent,
    scheduledFor: d.scheduledFor ?? (intent === "schedule" && a.scheduledFor ? a.scheduledFor.toISOString() : undefined),
    note: d.note ?? "Via admin API",
  });
  if (!result.ok) throw new ApiError(400, result.error ?? "Could not update");
  const after = await load(params.id);
  return { ok: true, id: after.id, status: after.status, url: after.url, image: after.featuredImageUrl, ...(imageNote ? { note: imageNote } : {}) };
});

/** DELETE /api/admin/articles/[id] */
export const DELETE = withAdminApi<{ id: string }>(async (_req, { params }) => {
  const a = await load(params.id);
  const db = await getDb();
  await db.delete(schema.articles).where(eq(schema.articles.id, a.id));
  await removeSearchDocument(a.kind === "news" ? "news" : "guide", a.id);
  revalidatePath("/");
  revalidatePath(a.kind === "news" ? "/news" : "/guides");
  return { ok: true, deleted: a.id };
});
