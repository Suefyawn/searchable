import { cache } from "react";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type ArticleKind = (typeof schema.articleKind.enumValues)[number];

const published = (kind?: ArticleKind) =>
  kind ? and(eq(schema.articles.status, "published"), eq(schema.articles.kind, kind)) : eq(schema.articles.status, "published");

export async function listCategories(kind: ArticleKind) {
  const db = await getDb();
  return db.query.categories.findMany({ where: eq(schema.categories.kind, kind), orderBy: [schema.categories.sortOrder, schema.categories.name] });
}

export async function getCategory(kind: ArticleKind, slug: string) {
  const db = await getDb();
  return db.query.categories.findFirst({ where: and(eq(schema.categories.kind, kind), eq(schema.categories.slug, slug)) });
}

export type ArticleListItem = {
  id: string;
  kind: ArticleKind;
  slug: string;
  title: string;
  dek: string | null;
  excerpt: string | null;
  featuredImageUrl: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  readingMinutes: number | null;
  isFeatured: boolean;
  category: { slug: string; name: string } | null;
  author: { slug: string; name: string } | null;
};

const listSelect = {
  id: schema.articles.id,
  kind: schema.articles.kind,
  slug: schema.articles.slug,
  title: schema.articles.title,
  dek: schema.articles.dek,
  excerpt: schema.articles.excerpt,
  featuredImageUrl: schema.articles.featuredImageUrl,
  publishedAt: schema.articles.publishedAt,
  updatedAt: schema.articles.updatedAt,
  readingMinutes: schema.articles.readingMinutes,
  isFeatured: schema.articles.isFeatured,
  categorySlug: schema.categories.slug,
  categoryName: schema.categories.name,
  authorSlug: schema.authors.slug,
  authorName: schema.authors.name,
};

function shape(r: { categorySlug: string | null; categoryName: string | null; authorSlug: string | null; authorName: string | null } & Omit<ArticleListItem, "category" | "author">): ArticleListItem {
  const { categorySlug, categoryName, authorSlug, authorName, ...rest } = r;
  return {
    ...rest,
    category: categorySlug && categoryName ? { slug: categorySlug, name: categoryName } : null,
    author: authorSlug && authorName ? { slug: authorSlug, name: authorName } : null,
  };
}

export async function listArticles(opts: { kind?: ArticleKind; categorySlug?: string; limit?: number; offset?: number; featured?: boolean; excludeId?: string } = {}) {
  const db = await getDb();
  const conds = [published(opts.kind)];
  if (opts.categorySlug) conds.push(eq(schema.categories.slug, opts.categorySlug));
  if (opts.featured) conds.push(eq(schema.articles.isFeatured, true));
  if (opts.excludeId) conds.push(ne(schema.articles.id, opts.excludeId));
  const rows = await db
    .select(listSelect)
    .from(schema.articles)
    .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
    .leftJoin(schema.authors, eq(schema.articles.authorId, schema.authors.id))
    .where(and(...conds))
    .orderBy(desc(schema.articles.publishedAt))
    .limit(opts.limit ?? 20)
    .offset(opts.offset ?? 0);
  return rows.map(shape);
}

/** Latest published stories linked to any of these entities (data pages show the news behind the number). */
export async function articlesForEntitySlugs(slugs: string[], limit = 4) {
  if (!slugs.length) return [];
  const db = await getDb();
  const rows = await db
    .select(listSelect)
    .from(schema.articles)
    .innerJoin(schema.entityLinks, and(eq(schema.entityLinks.targetType, "article"), eq(schema.entityLinks.targetId, schema.articles.id)))
    .innerJoin(schema.entities, eq(schema.entities.id, schema.entityLinks.entityId))
    .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
    .leftJoin(schema.authors, eq(schema.articles.authorId, schema.authors.id))
    .where(and(published(), inArray(schema.entities.slug, slugs)))
    .orderBy(desc(schema.articles.publishedAt))
    .limit(limit * 3);
  const seen = new Set<string>();
  return rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))).slice(0, limit).map(shape);
}

export async function countArticles(kind?: ArticleKind, categorySlug?: string) {
  const db = await getDb();
  const conds = [published(kind)];
  if (categorySlug) conds.push(eq(schema.categories.slug, categorySlug));
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.articles)
    .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
    .where(and(...conds));
  return row?.n ?? 0;
}

async function getArticleRaw(kind: ArticleKind, slug: string, opts: { includeDrafts?: boolean } = {}) {
  const db = await getDb();
  const conds = [eq(schema.articles.kind, kind), eq(schema.articles.slug, slug)];
  if (!opts.includeDrafts) conds.push(eq(schema.articles.status, "published"));
  return db.query.articles.findFirst({
    where: and(...conds),
    with: { category: true, author: true, location: true },
  });
}

export async function getArticlesBySlugs(kind: ArticleKind, slugs: string[]) {
  if (!slugs.length) return [];
  const db = await getDb();
  const rows = await db
    .select(listSelect)
    .from(schema.articles)
    .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
    .leftJoin(schema.authors, eq(schema.articles.authorId, schema.authors.id))
    .where(and(published(kind), inArray(schema.articles.slug, slugs)));
  return rows.map(shape);
}

export async function incrementArticleViews(id: string) {
  const db = await getDb();
  await db.update(schema.articles).set({ viewCount: sql`${schema.articles.viewCount} + 1` }).where(eq(schema.articles.id, id));
}

export async function getArticlesByIds(ids: string[]) {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select(listSelect)
    .from(schema.articles)
    .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
    .leftJoin(schema.authors, eq(schema.articles.authorId, schema.authors.id))
    .where(and(published(), inArray(schema.articles.id, ids)));
  const map = new Map(rows.map((r) => [r.id, shape(r)]));
  return ids.map((id) => map.get(id)).filter((x): x is ArticleListItem => !!x);
}

export async function getTagsForArticle(articleId: string) {
  const db = await getDb();
  return db
    .select({ id: schema.tags.id, slug: schema.tags.slug, name: schema.tags.name })
    .from(schema.articleTags)
    .innerJoin(schema.tags, eq(schema.articleTags.tagId, schema.tags.id))
    .where(eq(schema.articleTags.articleId, articleId));
}

/** Published articles by id, in no particular order (the caller orders); used for pinned and lead stories. */
export async function listArticlesByIds(ids: string[]): Promise<ArticleListItem[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db
    .select(listSelect)
    .from(schema.articles)
    .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
    .leftJoin(schema.authors, eq(schema.articles.authorId, schema.authors.id))
    .where(and(inArray(schema.articles.id, ids), published()));
  return rows.map(shape);
}

export async function listArticlesByTag(tagSlug: string, limit = 30) {
  const db = await getDb();
  const tag = await db.query.tags.findFirst({ where: eq(schema.tags.slug, tagSlug) });
  if (!tag) return null;
  const rows = await db
    .select(listSelect)
    .from(schema.articleTags)
    .innerJoin(schema.articles, eq(schema.articleTags.articleId, schema.articles.id))
    .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
    .leftJoin(schema.authors, eq(schema.articles.authorId, schema.authors.id))
    .where(and(eq(schema.articleTags.tagId, tag.id), published()))
    .orderBy(desc(schema.articles.publishedAt))
    .limit(limit);
  return { tag, items: rows.map(shape) };
}

export async function listArticlesByAuthor(authorSlug: string, limit = 30) {
  const db = await getDb();
  const author = await db.query.authors.findFirst({ where: eq(schema.authors.slug, authorSlug) });
  if (!author) return null;
  const rows = await db
    .select(listSelect)
    .from(schema.articles)
    .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
    .leftJoin(schema.authors, eq(schema.articles.authorId, schema.authors.id))
    .where(and(eq(schema.articles.authorId, author.id), published()))
    .orderBy(desc(schema.articles.publishedAt))
    .limit(limit);
  return { author, items: rows.map(shape) };
}
/** Memoised per request: generateMetadata and the page body ask for the same article. */
export const getArticle = cache(getArticleRaw);
