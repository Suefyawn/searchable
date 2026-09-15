import { index, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";

export const redirects = pgTable("redirects", {
  id: id(),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").default(301).notNull(),
  createdAt: createdAt(),
});

export const media = pgTable("media", {
  id: id(),
  url: text("url").notNull(),
  storageKey: text("storage_key"),
  mimeType: text("mime_type"),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  alt: text("alt"),
  credit: text("credit"),
  createdAt: createdAt(),
});

/** First-party analytics. Sampled page views + every meaningful action. */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: id(),
    name: text("name").notNull(), // page_view | search | tool_run | business_click | newsletter_subscribe
    path: text("path"),
    props: jsonb("props").$type<Record<string, unknown>>().default({}).notNull(),
    sessionId: text("session_id"),
    createdAt: createdAt(),
  },
  (t) => [index("analytics_events_name_created_idx").on(t.name, t.createdAt)],
);

/** Key/value site settings editable from admin (homepage trending, banner, feature flags). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});
