import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { bool, createdAt, id, json, timestampMs, updatedAt } from "./_shared";

/**
 * Tool metadata mirrored from the code registry (src/tools/registry.ts) by the seed script.
 * The calculation itself lives in code; this row exists for search, SEO, listing, and usage stats.
 */
export const tools = sqliteTable(
  "tools",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    category: text("category").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name"),
    description: text("description").notNull(),
    keywords: json("keywords").$type<string[]>().default([]).notNull(),
    version: text("version").notNull(),
    lastReviewedAt: timestampMs("last_reviewed_at"),
    isActive: bool("is_active").default(true).notNull(),
    isFeatured: bool("is_featured").default(false).notNull(),
    runCount: integer("run_count").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("tools_category_idx").on(t.category)],
);

/** Anonymised usage: what people calculate tells us what to build next. */
export const toolRuns = sqliteTable(
  "tool_runs",
  {
    id: id(),
    toolSlug: text("tool_slug").notNull(),
    inputs: json("inputs").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("tool_runs_slug_created_idx").on(t.toolSlug, t.createdAt)],
);
