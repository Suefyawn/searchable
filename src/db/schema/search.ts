import { check, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, enumCheckSql, enumColumn, id, json, textEnum, timestampMs, updatedAt } from "./_shared";

export const searchEntityType = textEnum("search_entity_type", [
  "news",
  "guide",
  "tool",
  "business",
  "location",
  "entity",
  "data_series",
  "comparison",
  "professional",
  "post",
]);

/**
 * The federated search index. Every searchable thing on Searchable writes one row here.
 * Full-text ranking lives in an FTS5 virtual table kept in step by triggers; both are created by a
 * hand-written migration, so the Drizzle schema does not model them.
 */
export const searchDocuments = sqliteTable(
  "search_documents",
  {
    /** Integer key the FTS5 tables reference as their rowid; a text primary key alone would leave rowid unstable. */
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    id: text("id")
      .notNull()
      .unique()
      .$defaultFn(() => crypto.randomUUID()),
    entityType: enumColumn("entity_type", searchEntityType).notNull(),
    entityId: text("entity_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    body: text("body"),
    /** Extra searchable terms: aliases, keywords, Roman-Urdu variants. */
    keywords: text("keywords"),
    category: text("category"),
    categorySlug: text("category_slug"),
    city: text("city"),
    citySlug: text("city_slug"),
    imageUrl: text("image_url"),
    /** Multiplier applied to the FTS rank (tools 1.4, guides 1.2, news 1.0, businesses 1.0, locations 0.8). */
    boost: real("boost").default(1).notNull(),
    popularity: integer("popularity").default(0).notNull(),
    meta: json("meta").$type<Record<string, unknown>>().default({}).notNull(),
    publishedAt: timestampMs("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("search_documents_entity_idx").on(t.entityType, t.entityId),
    index("search_documents_type_idx").on(t.entityType),
    check("search_documents_entity_type_check", enumCheckSql("entity_type", searchEntityType)),
  ],
);

export const searchQueries = sqliteTable(
  "search_queries",
  {
    id: id(),
    query: text("query").notNull(),
    normalized: text("normalized").notNull(),
    resultCount: integer("result_count").default(0).notNull(),
    clickedUrl: text("clicked_url"),
    sessionId: text("session_id"),
    createdAt: createdAt(),
  },
  (t) => [index("search_queries_normalized_idx").on(t.normalized), index("search_queries_created_idx").on(t.createdAt)],
);

export const searchSynonyms = sqliteTable("search_synonyms", {
  id: id(),
  term: text("term").notNull().unique(),
  synonyms: json("synonyms").$type<string[]>().default([]).notNull(),
});
