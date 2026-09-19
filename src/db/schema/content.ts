import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { bool, createdAt, enumCheckSql, enumColumn, id, json, textEnum, timestampMs, updatedAt } from "./_shared";
import { users } from "./auth";
import { locations } from "./geo";

export const articleKind = textEnum("article_kind", ["news", "guide", "explainer", "page"]);
export const articleStatus = textEnum("article_status", [
  "draft",
  "research",
  "editing",
  "fact_check",
  "scheduled",
  "published",
  "archived",
]);

/** Categories are scoped by kind so /news/technology and /guides/technology can coexist. */
export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    kind: enumColumn("kind", articleKind).notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("categories_kind_slug_idx").on(t.kind, t.slug), check("categories_kind_check", enumCheckSql("kind", articleKind))],
);

export const authors = sqliteTable("authors", {
  id: id(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: createdAt(),
});

export type ArticleSource = { title: string; url?: string; publisher?: string; date?: string };
export type ArticleFaq = { question: string; answer: string };

export const articles = sqliteTable(
  "articles",
  {
    id: id(),
    kind: enumColumn("kind", articleKind).notNull(),
    status: enumColumn("status", articleStatus).default("draft").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    dek: text("dek"),
    /** Markdown body. */
    body: text("body").notNull().default(""),
    excerpt: text("excerpt"),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    authorId: text("author_id").references(() => authors.id, { onDelete: "set null" }),
    /** Optional local angle (e.g. news about Lahore). */
    locationId: text("location_id").references(() => locations.id, { onDelete: "set null" }),
    featuredImageUrl: text("featured_image_url"),
    featuredImageAlt: text("featured_image_alt"),
    /** Attribution line for openly licensed photos, e.g. "Kamran Aslam / Wikimedia Commons, CC BY-SA 4.0". */
    featuredImageCredit: text("featured_image_credit"),
    featuredImageSourceUrl: text("featured_image_source_url"),
    sources: json("sources").$type<ArticleSource[]>().default([]).notNull(),
    /** Hand-picked related article ids (shown before automatic same-category picks). */
    relatedIds: json("related_ids").$type<string[]>().default([]).notNull(),
    faqs: json("faqs").$type<ArticleFaq[]>().default([]).notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    /** Paid / sponsored content: disclosure shown, outbound links rel="sponsored". */
    isSponsored: bool("is_sponsored").default(false).notNull(),
    /** Guest contributor byline when the author is not a staff author. */
    contributorName: text("contributor_name"),
    contributorBio: text("contributor_bio"),
    canonicalUrl: text("canonical_url"),
    noindex: bool("noindex").default(false).notNull(),
    isFeatured: bool("is_featured").default(false).notNull(),
    readingMinutes: integer("reading_minutes"),
    viewCount: integer("view_count").default(0).notNull(),
    publishedAt: timestampMs("published_at"),
    scheduledFor: timestampMs("scheduled_for"),
    lastReviewedAt: timestampMs("last_reviewed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("articles_kind_slug_idx").on(t.kind, t.slug),
    index("articles_status_published_idx").on(t.status, t.publishedAt),
    index("articles_category_idx").on(t.categoryId),
    check("articles_kind_check", enumCheckSql("kind", articleKind)),
    check("articles_status_check", enumCheckSql("status", articleStatus)),
  ],
);

export const tags = sqliteTable("tags", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const articleTags = sqliteTable(
  "article_tags",
  {
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.tagId] })],
);

/** Every publish snapshots the article so corrections are auditable. */
export const articleRevisions = sqliteTable(
  "article_revisions",
  {
    id: id(),
    articleId: text("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    editorId: text("editor_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("article_revisions_article_idx").on(t.articleId)],
);
