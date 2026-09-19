import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, enumCheckSql, enumColumn, id, json, textEnum, timestampMs, updatedAt } from "./_shared";

export const subscriberStatus = textEnum("subscriber_status", ["pending", "active", "unsubscribed", "bounced"]);
export const newsletterFrequency = textEnum("newsletter_frequency", ["daily", "weekly"]);

export const NEWSLETTER_TOPICS = ["pakistan", "business", "technology", "ai", "finance", "cars", "property", "jobs"] as const;
export type NewsletterTopic = (typeof NEWSLETTER_TOPICS)[number];

export const newsletterSubscribers = sqliteTable(
  "newsletter_subscribers",
  {
    id: id(),
    email: text("email").notNull().unique(),
    name: text("name"),
    status: enumColumn("status", subscriberStatus).default("pending").notNull(),
    frequency: enumColumn("frequency", newsletterFrequency).default("daily").notNull(),
    topics: json("topics").$type<NewsletterTopic[]>().default([]).notNull(),
    cityId: text("city_id"),
    confirmToken: text("confirm_token"),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    source: text("source"), // home | article | tool | footer
    confirmedAt: timestampMs("confirmed_at"),
    unsubscribedAt: timestampMs("unsubscribed_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("newsletter_subscribers_status_idx").on(t.status),
    check("newsletter_subscribers_status_check", enumCheckSql("status", subscriberStatus)),
    check("newsletter_subscribers_frequency_check", enumCheckSql("frequency", newsletterFrequency)),
  ],
);

export const newsletterIssues = sqliteTable(
  "newsletter_issues",
  {
    id: id(),
    subject: text("subject").notNull(),
    preheader: text("preheader"),
    /** Markdown body assembled from the day's content. */
    body: text("body").notNull(),
    frequency: enumColumn("frequency", newsletterFrequency).default("daily").notNull(),
    status: text("status").default("draft").notNull(), // draft | scheduled | sent
    scheduledFor: timestampMs("scheduled_for"),
    sentAt: timestampMs("sent_at"),
    recipientCount: integer("recipient_count").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check("newsletter_issues_frequency_check", enumCheckSql("frequency", newsletterFrequency))],
);
