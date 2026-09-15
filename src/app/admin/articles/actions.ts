"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { readingMinutes } from "@/lib/format";
import { indexArticle } from "@/lib/indexers";
import { plainText } from "@/lib/markdown";
import { slugify, uniqueSlug } from "@/lib/slug";

const ArticleInput = z.object({
  id: z.string().optional(),
  kind: z.enum(["news", "guide", "explainer", "page"]),
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().max(120).optional(),
  dek: z.string().trim().max(400).optional(),
  body: z.string().max(200_000),
  categoryId: z.string().optional(),
  locationId: z.string().optional(),
  featuredImageUrl: z.string().trim().max(500).optional(),
  seoTitle: z.string().trim().max(120).optional(),
  seoDescription: z.string().trim().max(200).optional(),
  isFeatured: z.boolean().optional(),
  noindex: z.boolean().optional(),
  sources: z.array(z.object({ title: z.string().min(1), url: z.string().optional(), publisher: z.string().optional() })).default([]),
  faqs: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).default([]),
  entitySlugs: z.array(z.string()).default([]),
  intent: z.enum(["save", "publish", "unpublish"]),
  note: z.string().max(300).optional(),
});

export type ArticleFormInput = z.infer<typeof ArticleInput>;

export async function saveArticle(raw: ArticleFormInput): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await requireRole("editor");
  const parsed = ArticleInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const d = parsed.data;
  const db = await getDb();

  const existing = d.id ? await db.query.articles.findFirst({ where: eq(schema.articles.id, d.id) }) : undefined;
  const baseSlug = slugify(d.slug || d.title) || "untitled";
  const slug =
    existing && existing.slug === baseSlug
      ? baseSlug
      : await uniqueSlug(baseSlug, async (s) => !!(await db.query.articles.findFirst({ where: and(eq(schema.articles.kind, d.kind), eq(schema.articles.slug, s), existing ? ne(schema.articles.id, existing.id) : undefined), columns: { id: true } })));

  const status = d.intent === "publish" ? "published" : d.intent === "unpublish" ? "draft" : (existing?.status ?? "draft");
  const publishedAt = d.intent === "publish" ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null;

  const values = {
    kind: d.kind,
    status,
    slug,
    title: d.title,
    dek: d.dek || null,
    body: d.body,
    excerpt: plainText(d.body, 180),
    categoryId: d.categoryId || null,
    locationId: d.locationId || null,
    featuredImageUrl: d.featuredImageUrl || null,
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
    isFeatured: !!d.isFeatured,
    noindex: !!d.noindex,
    sources: d.sources,
    faqs: d.faqs,
    readingMinutes: readingMinutes(d.body),
    publishedAt,
    lastReviewedAt: d.intent === "publish" ? new Date() : existing?.lastReviewedAt ?? null,
  } as const;

  let id: string;
  if (existing) {
    await db.update(schema.articles).set(values).where(eq(schema.articles.id, existing.id));
    id = existing.id;
  } else {
    const author = await db.query.authors.findFirst({ where: eq(schema.authors.userId, user.id) });
    const [row] = await db.insert(schema.articles).values({ ...values, authorId: author?.id }).returning({ id: schema.articles.id });
    id = row.id;
  }

  if (d.intent === "publish") {
    await db.insert(schema.articleRevisions).values({ articleId: id, editorId: user.id, title: d.title, body: d.body, note: d.note });
  }

  // Entity links (replace set).
  await db.delete(schema.entityLinks).where(and(eq(schema.entityLinks.targetType, "article"), eq(schema.entityLinks.targetId, id)));
  if (d.entitySlugs.length) {
    const ents = await db.query.entities.findMany({ where: (e, { inArray }) => inArray(e.slug, d.entitySlugs) });
    if (ents.length) await db.insert(schema.entityLinks).values(ents.map((e) => ({ entityId: e.id, targetType: "article" as const, targetId: id, relation: "about" })));
  }

  await indexArticle(id);
  const section = d.kind === "news" ? "news" : "guides";
  revalidatePath("/");
  revalidatePath(`/${section}`);
  revalidatePath(`/${section}/[category]`, "page");
  revalidatePath(`/${section}/[category]/[slug]`, "page");
  return { ok: true, id };
}

export async function deleteArticle(id: string) {
  await requireRole("admin");
  const db = await getDb();
  const a = await db.query.articles.findFirst({ where: eq(schema.articles.id, id) });
  if (!a) return;
  await db.delete(schema.articles).where(eq(schema.articles.id, id));
  await db.delete(schema.searchDocuments).where(and(eq(schema.searchDocuments.entityId, id)));
  revalidatePath("/");
  redirect("/admin/articles");
}
