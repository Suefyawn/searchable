import { index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
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

export const reportTarget = pgEnum("report_target", ["business", "review", "article"]);
export const reportStatus = pgEnum("report_status", ["open", "resolved", "dismissed"]);

/** User reports: wrong details, closed business, abusive review, factual error. */
export const reports = pgTable(
  "reports",
  {
    id: id(),
    targetType: reportTarget("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(), // wrong_details | closed | duplicate | inappropriate | factual_error | other
    details: text("details"),
    reporterEmail: text("reporter_email"),
    reporterUserId: text("reporter_user_id"),
    status: reportStatus("status").default("open").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("reports_status_idx").on(t.status, t.createdAt), index("reports_target_idx").on(t.targetType, t.targetId)],
);

/** Contact-form messages (also emailed). */
export const messages = pgTable(
  "messages",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    about: text("about"),
    status: text("status").default("new").notNull(), // new | replied | archived
    createdAt: createdAt(),
  },
  (t) => [index("messages_status_idx").on(t.status, t.createdAt)],
);
