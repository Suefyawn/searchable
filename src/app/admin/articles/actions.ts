"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { readingMinutes } from "@/lib/format";
import { indexArticle } from "@/lib/indexers";
import { plainText } from "@/lib/markdown";
import { slugify, uniqueSlug } from "@/lib/slug";

const WORKFLOW = ["draft", "research", "editing", "fact_check"] as const;

const ArticleInput = z.object({
  id: z.string().optional(),
  kind: z.enum(["news", "guide", "explainer", "page"]),
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().max(120).optional(),
  dek: z.string().trim().max(400).optional(),
  body: z.string().max(200_000),
  categoryId: z.string().optional(),
  authorId: z.string().optional(),
  locationId: z.string().optional(),
  featuredImageUrl: z.string().trim().max(500).optional(),
  featuredImageAlt: z.string().trim().max(300).optional(),
  seoTitle: z.string().trim().max(120).optional(),
  seoDescription: z.string().trim().max(200).optional(),
  canonicalUrl: z.string().trim().max(500).optional(),
  isFeatured: z.boolean().optional(),
  noindex: z.boolean().optional(),
  sources: z.array(z.object({ title: z.string().min(1), url: z.string().optional(), publisher: z.string().optional() })).default([]),
  faqs: z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) })).default([]),
  entitySlugs: z.array(z.string()).default([]),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  relatedIds: z.array(z.string()).max(6).default([]),
  /** Workflow stage while unpublished. */
  workflow: z.enum(WORKFLOW).optional(),
  /** ISO datetime; used with intent "schedule". */
  scheduledFor: z.string().optional(),
  intent: z.enum(["save", "publish", "schedule", "unpublish"]),
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

  let status: (typeof schema.articleStatus.enumValues)[number] = existing?.status ?? "draft";
  let scheduledFor: Date | null = existing?.scheduledFor ?? null;
  let publishedAt: Date | null = existing?.publishedAt ?? null;
  if (d.intent === "publish") {
    status = "published";
    publishedAt = publishedAt ?? new Date();
    scheduledFor = null;
  } else if (d.intent === "schedule") {
    const when = d.scheduledFor ? new Date(d.scheduledFor) : null;
    if (!when || Number.isNaN(when.getTime())) return { ok: false, error: "Pick a date and time to schedule." };
    if (when.getTime() <= Date.now()) return { ok: false, error: "Scheduled time must be in the future — or just publish now." };
    status = "scheduled";
    scheduledFor = when;
  } else if (d.intent === "unpublish") {
    status = d.workflow ?? "draft";
    scheduledFor = null;
  } else if (status !== "published" && status !== "scheduled" && d.workflow) {
    status = d.workflow;
  }

  const values = {
    kind: d.kind,
    status,
    slug,
    title: d.title,
    dek: d.dek || null,
    body: d.body,
    excerpt: plainText(d.body, 180),
    categoryId: d.categoryId || null,
    authorId: d.authorId || null,
    locationId: d.locationId || null,
    featuredImageUrl: d.featuredImageUrl || null,
    featuredImageAlt: d.featuredImageAlt || null,
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
    canonicalUrl: d.canonicalUrl || null,
    isFeatured: !!d.isFeatured,
    noindex: !!d.noindex,
    sources: d.sources,
    faqs: d.faqs,
    relatedIds: d.relatedIds.filter((r) => r !== existing?.id),
    readingMinutes: readingMinutes(d.body),
    publishedAt,
    scheduledFor,
    lastReviewedAt: d.intent === "publish" ? new Date() : (existing?.lastReviewedAt ?? null),
  } as const;

  let id: string;
  if (existing) {
    await db.update(schema.articles).set(values).where(eq(schema.articles.id, existing.id));
    id = existing.id;
  } else {
    const author = d.authorId ? null : await db.query.authors.findFirst({ where: eq(schema.authors.userId, user.id) });
    const [row] = await db.insert(schema.articles).values({ ...values, authorId: values.authorId ?? author?.id ?? null }).returning({ id: schema.articles.id });
    id = row.id;
  }

  if (d.intent === "publish") {
    await db.insert(schema.articleRevisions).values({ articleId: id, editorId: user.id, title: d.title, body: d.body, note: d.note });
  }

  // Entity links (replace set).
  await db.delete(schema.entityLinks).where(and(eq(schema.entityLinks.targetType, "article"), eq(schema.entityLinks.targetId, id)));
  if (d.entitySlugs.length) {
    const ents = await db.query.entities.findMany({ where: inArray(schema.entities.slug, d.entitySlugs) });
    if (ents.length) await db.insert(schema.entityLinks).values(ents.map((e) => ({ entityId: e.id, targetType: "article" as const, targetId: id, relation: "about" })));
  }

  // Tags (upsert by slug, replace set).
  await db.delete(schema.articleTags).where(eq(schema.articleTags.articleId, id));
  const tagNames = Array.from(new Set(d.tags.map((t) => t.trim()).filter(Boolean)));
  if (tagNames.length) {
    const tagIds: string[] = [];
    for (const name of tagNames) {
      const tslug = slugify(name);
      if (!tslug) continue;
      const [t] = await db.insert(schema.tags).values({ slug: tslug, name }).onConflictDoUpdate({ target: schema.tags.slug, set: { name } }).returning({ id: schema.tags.id });
      tagIds.push(t.id);
    }
    if (tagIds.length) await db.insert(schema.articleTags).values(tagIds.map((tagId) => ({ articleId: id, tagId }))).onConflictDoNothing();
  }

  await indexArticle(id);
  const section = d.kind === "news" ? "news" : "guides";
  revalidateTag("articles", "max");
  revalidatePath("/");
  revalidatePath(`/${section}`);
  revalidatePath(`/${section}/[category]`, "page");
  revalidatePath(`/${section}/[category]/[slug]`, "page");
  revalidatePath("/feed.xml");
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

/** Publish everything whose scheduled time has passed. Called by /api/cron/publish. */
export async function publishDueArticles(): Promise<number> {
  const db = await getDb();
  const due = await db.query.articles.findMany({ where: eq(schema.articles.status, "scheduled") });
  const now = Date.now();
  let n = 0;
  for (const a of due) {
    if (!a.scheduledFor || a.scheduledFor.getTime() > now) continue;
    await db.update(schema.articles).set({ status: "published", publishedAt: a.publishedAt ?? new Date(), scheduledFor: null, lastReviewedAt: new Date() }).where(eq(schema.articles.id, a.id));
    await db.insert(schema.articleRevisions).values({ articleId: a.id, title: a.title, body: a.body, note: "Published on schedule" });
    await indexArticle(a.id);
    n++;
  }
  if (n) {
    revalidatePath("/");
    revalidatePath("/news");
    revalidatePath("/guides");
    revalidatePath("/feed.xml");
  }
  return n;
}
