import { index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";

export const subscriberStatus = pgEnum("subscriber_status", ["pending", "active", "unsubscribed", "bounced"]);
export const newsletterFrequency = pgEnum("newsletter_frequency", ["daily", "weekly"]);

export const NEWSLETTER_TOPICS = ["pakistan", "business", "technology", "ai", "finance", "cars", "property", "jobs"] as const;
export type NewsletterTopic = (typeof NEWSLETTER_TOPICS)[number];

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: id(),
    email: text("email").notNull().unique(),
    name: text("name"),
    status: subscriberStatus("status").default("pending").notNull(),
    frequency: newsletterFrequency("frequency").default("daily").notNull(),
    topics: jsonb("topics").$type<NewsletterTopic[]>().default([]).notNull(),
    cityId: text("city_id"),
    confirmToken: text("confirm_token"),
    unsubscribeToken: text("unsubscribe_token").notNull(),
    source: text("source"), // home | article | tool | footer
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("newsletter_subscribers_status_idx").on(t.status)],
);

export const newsletterIssues = pgTable("newsletter_issues", {
  id: id(),
  subject: text("subject").notNull(),
  preheader: text("preheader"),
  /** Markdown body assembled from the day's content. */
  body: text("body").notNull(),
  frequency: newsletterFrequency("frequency").default("daily").notNull(),
  status: text("status").default("draft").notNull(), // draft | scheduled | sent
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  recipientCount: integer("recipient_count").default(0).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
