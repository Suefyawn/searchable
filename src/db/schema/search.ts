import { sql } from "drizzle-orm";
import { doublePrecision, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, tsvector, updatedAt } from "./_shared";

export const searchEntityType = pgEnum("search_entity_type", [
  "news",
  "guide",
  "tool",
  "business",
  "location",
  "entity",
  "data_series",
  "comparison",
]);

/**
 * The federated search index. Every searchable thing on Searchable writes one row here.
 * `tsv` is a stored generated column so ranking happens in SQL with a GIN index.
 */
export const searchDocuments = pgTable(
  "search_documents",
  {
    id: id(),
    entityType: searchEntityType("entity_type").notNull(),
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
    boost: doublePrecision("boost").default(1).notNull(),
    popularity: integer("popularity").default(0).notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    tsv: tsvector("tsv").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(keywords, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(category, '') || ' ' || coalesce(city, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(body, '')), 'C')`,
    ),
    /** Unstemmed vector of the short fields, for prefix matching ("electri" → electricity). */
    tsvSimple: tsvector("tsv_simple").generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(keywords, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(category, '') || ' ' || coalesce(city, ''))`,
    ),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("search_documents_entity_idx").on(t.entityType, t.entityId),
    index("search_documents_tsv_idx").using("gin", t.tsv),
    index("search_documents_tsv_simple_idx").using("gin", t.tsvSimple),
    index("search_documents_type_idx").on(t.entityType),
  ],
);

export const searchQueries = pgTable(
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

export const searchSynonyms = pgTable("search_synonyms", {
  id: id(),
  term: text("term").notNull().unique(),
  synonyms: jsonb("synonyms").$type<string[]>().default([]).notNull(),
});
