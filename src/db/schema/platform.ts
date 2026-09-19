import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, enumCheckSql, enumColumn, id, json, textEnum, timestampMs, updatedAt } from "./_shared";

export const redirects = sqliteTable("redirects", {
  id: id(),
  fromPath: text("from_path").notNull().unique(),
  toPath: text("to_path").notNull(),
  statusCode: integer("status_code").default(301).notNull(),
  createdAt: createdAt(),
});

export const media = sqliteTable("media", {
  id: id(),
  url: text("url").notNull(),
  storageKey: text("storage_key"),
  mimeType: text("mime_type"),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  alt: text("alt"),
  credit: text("credit"),
  /** SPDX-like licence id for openly licensed imports: cc0 | by | by-sa | pdm | uploaded. */
  license: text("license"),
  licenseVersion: text("license_version"),
  /** Page the image came from (Flickr photo page, Commons file page). */
  sourceUrl: text("source_url"),
  createdAt: createdAt(),
});

/** First-party analytics. Sampled page views + every meaningful action. */
export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: id(),
    name: text("name").notNull(), // page_view | search | tool_run | business_click | newsletter_subscribe
    path: text("path"),
    props: json("props").$type<Record<string, unknown>>().default({}).notNull(),
    sessionId: text("session_id"),
    createdAt: createdAt(),
  },
  (t) => [index("analytics_events_name_created_idx").on(t.name, t.createdAt)],
);

/** Key/value site settings editable from admin (homepage trending, banner, feature flags). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: json("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});

export const reportTarget = textEnum("report_target", ["business", "review", "article", "post", "comment", "professional", "member"]);
export const reportStatus = textEnum("report_status", ["open", "resolved", "dismissed"]);

/** User reports: wrong details, closed business, abusive review, factual error. */
export const reports = sqliteTable(
  "reports",
  {
    id: id(),
    targetType: enumColumn("target_type", reportTarget).notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(), // wrong_details | closed | duplicate | inappropriate | factual_error | other
    details: text("details"),
    reporterEmail: text("reporter_email"),
    reporterUserId: text("reporter_user_id"),
    status: enumColumn("status", reportStatus).default("open").notNull(),
    resolvedAt: timestampMs("resolved_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("reports_status_idx").on(t.status, t.createdAt),
    index("reports_target_idx").on(t.targetType, t.targetId),
    check("reports_target_type_check", enumCheckSql("target_type", reportTarget)),
    check("reports_status_check", enumCheckSql("status", reportStatus)),
  ],
);

/** Contact-form messages (also emailed). */
export const messages = sqliteTable(
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

/**
 * Mail received at *@searchable.pk through Resend receiving, mirrored here so the admin inbox has read
 * state and survives the provider's retention window. `id` is Resend's received-email id so syncs and
 * webhooks are idempotent. HTML and attachments stay at Resend and are fetched when a message is opened.
 */
export const inboxMessages = sqliteTable(
  "inbox_messages",
  {
    id: text("id").primaryKey(),
    /** Local part of the searchable.pk address it was sent to (editorial, billing, hello). */
    mailbox: text("mailbox").notNull(),
    fromAddress: text("from_address").notNull(),
    fromName: text("from_name"),
    to: json("to").$type<string[]>().default([]).notNull(),
    cc: json("cc").$type<string[]>().default([]).notNull(),
    replyTo: json("reply_to").$type<string[]>().default([]).notNull(),
    subject: text("subject").notNull(),
    snippet: text("snippet").notNull(),
    /** Plain-text body, capped; HTML is fetched live. */
    text: text("text"),
    hasHtml: integer("has_html").default(0).notNull(),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    attachments: json("attachments").$type<{ id: string; filename: string; contentType: string; size: number }[]>().default([]).notNull(),
    status: text("status").default("new").notNull(), // new | replied | archived
    readAt: timestampMs("read_at"),
    repliedAt: timestampMs("replied_at"),
    receivedAt: timestampMs("received_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("inbox_messages_status_idx").on(t.status, t.receivedAt), index("inbox_messages_mailbox_idx").on(t.mailbox, t.receivedAt)],
);

/** Run reports filed by the scheduled editorial task (POST /api/admin/report); shown on /admin/automation. */
export const automationReports = sqliteTable(
  "automation_reports",
  {
    id: id(),
    slot: text("slot").notNull(),
    at: timestampMs("at").notNull(),
    report: text("report").notNull(),
    published: integer("published"),
    updated: integer("updated"),
    errors: integer("errors"),
  },
  (t) => [index("automation_reports_at_idx").on(t.at)],
);

/**
 * Error tracker (ADR-48): one row per distinct error (a fingerprint of route + name + top stack frame), counted
 * on every occurrence. The first occurrence sends one email; nothing else does. /admin/system lists them.
 */
export const errorSource = textEnum("error_source", ["server", "client"]);
export const errorFingerprints = sqliteTable(
  "error_fingerprints",
  {
    fp: text("fp").primaryKey(),
    source: enumColumn("source", errorSource).notNull(),
    route: text("route").notNull(),
    name: text("name").notNull(),
    message: text("message").notNull(),
    topFrame: text("top_frame"),
    sample: json("sample").$type<Record<string, unknown>>().notNull(),
    count: integer("count").default(1).notNull(),
    firstSeen: timestampMs("first_seen").notNull(),
    lastSeen: timestampMs("last_seen").notNull(),
  },
  (t) => [index("error_fingerprints_last_seen_idx").on(t.lastSeen), check("error_fingerprints_source_check", enumCheckSql("source", errorSource))],
);
