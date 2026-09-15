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

export async function countArticles(kind?: ArticleKind, categorySlug?: string) {
  const db = await getDb();
  const conds = [published(kind)];
  if (categorySlug) conds.push(eq(schema.categories.slug, categorySlug));
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.articles)
    .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
    .where(and(...conds));
  return row?.n ?? 0;
}

export async function getArticle(kind: ArticleKind, slug: string, opts: { includeDrafts?: boolean } = {}) {
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
