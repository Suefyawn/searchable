import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ApiError, withAdminApi } from "@/lib/admin-api";
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

const Patch = z.object({ intent: z.enum(["publish", "unpublish", "schedule"]), scheduledFor: z.string().optional(), note: z.string().max(300).optional() });

/** PATCH /api/admin/articles/[id] { intent: publish | unpublish | schedule, scheduledFor } */
export const PATCH = withAdminApi<{ id: string }>(async (_req, { params, body }) => {
  const d = Patch.parse(body);
  const a = await load(params.id);
  const result = await saveArticle({
    id: a.id,
    kind: a.kind,
    title: a.title,
    slug: a.slug,
    dek: a.dek ?? undefined,
    body: a.body,
    categoryId: a.categoryId ?? undefined,
    authorId: a.authorId ?? undefined,
    locationId: a.locationId ?? undefined,
    featuredImageUrl: a.featuredImageUrl ?? undefined,
    featuredImageAlt: a.featuredImageAlt ?? undefined,
    featuredImageCredit: a.featuredImageCredit ?? undefined,
    featuredImageSourceUrl: a.featuredImageSourceUrl ?? undefined,
    seoTitle: a.seoTitle ?? undefined,
    seoDescription: a.seoDescription ?? undefined,
    isFeatured: a.isFeatured,
    noindex: a.noindex,
    sources: (a.sources ?? []) as { title: string; url?: string; publisher?: string }[],
    faqs: (a.faqs ?? []) as { question: string; answer: string }[],
    entitySlugs: a.entities as string[],
    tags: a.tags as string[],
    relatedIds: (a.relatedIds ?? []) as string[],
    intent: d.intent,
    scheduledFor: d.scheduledFor,
    note: d.note ?? "Via admin API",
  });
  if (!result.ok) throw new ApiError(400, result.error ?? "Could not update");
  const after = await load(params.id);
  return { ok: true, id: after.id, status: after.status, url: after.url };
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
