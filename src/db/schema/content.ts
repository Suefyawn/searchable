import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { users } from "./auth";
import { locations } from "./geo";

export const articleKind = pgEnum("article_kind", ["news", "guide", "explainer", "page"]);
export const articleStatus = pgEnum("article_status", [
  "draft",
  "research",
  "editing",
  "fact_check",
  "scheduled",
  "published",
  "archived",
]);

/** Categories are scoped by kind so /news/technology and /guides/technology can coexist. */
export const categories = pgTable(
  "categories",
  {
    id: id(),
    kind: articleKind("kind").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("categories_kind_slug_idx").on(t.kind, t.slug)],
);

export const authors = pgTable("authors", {
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

export const articles = pgTable(
  "articles",
  {
    id: id(),
    kind: articleKind("kind").notNull(),
    status: articleStatus("status").default("draft").notNull(),
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
    sources: jsonb("sources").$type<ArticleSource[]>().default([]).notNull(),
    /** Hand-picked related article ids (shown before automatic same-category picks). */
    relatedIds: jsonb("related_ids").$type<string[]>().default([]).notNull(),
    faqs: jsonb("faqs").$type<ArticleFaq[]>().default([]).notNull(),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalUrl: text("canonical_url"),
    noindex: boolean("noindex").default(false).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    readingMinutes: integer("reading_minutes"),
    viewCount: integer("view_count").default(0).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("articles_kind_slug_idx").on(t.kind, t.slug),
    index("articles_status_published_idx").on(t.status, t.publishedAt),
    index("articles_category_idx").on(t.categoryId),
  ],
);

export const tags = pgTable("tags", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const articleTags = pgTable(
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
export const articleRevisions = pgTable(
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
