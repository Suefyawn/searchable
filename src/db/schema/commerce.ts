import { index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { users } from "./auth";
import { articles } from "./content";
import { businesses } from "./directory";

/**
 * Revenue: paid business plans (verified / premium / sponsored placements) and paid sponsored posts.
 * Payment locally is "manual" (bank transfer / JazzCash / Easypaisa with a reference), marked paid in admin.
 * A card gateway (Safepay / PayFast / Stripe) plugs in as another `provider` without touching the rest.
 */

export const orderKind = pgEnum("order_kind", ["business_plan", "sponsored_post", "placement"]);
export const orderStatus = pgEnum("order_status", ["pending", "paid", "active", "expired", "cancelled", "refunded"]);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    invoiceNo: text("invoice_no").notNull().unique(),
    kind: orderKind("kind").notNull(),
    /** Plan / product code from src/content/pricing.ts, e.g. verified-annual, premium-monthly, sponsored-post. */
    productCode: text("product_code").notNull(),
    productName: text("product_name").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    businessId: text("business_id").references(() => businesses.id, { onDelete: "set null" }),
    submissionId: text("submission_id"),
    amountPkr: integer("amount_pkr").notNull(),
    status: orderStatus("status").default("pending").notNull(),
    /** manual | jazzcash | easypaisa | safepay | stripe */
    provider: text("provider").default("manual").notNull(),
    /** Payer's transaction reference / screenshot note. */
    paymentReference: text("payment_reference"),
    payerName: text("payer_name"),
    payerEmail: text("payer_email"),
    payerPhone: text("payer_phone"),
    /** What the buyer is paying for, in plain words (e.g. "Featured in Restaurants · Lahore"). */
    notes: text("notes"),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_business_idx").on(t.businessId), index("orders_user_idx").on(t.userId)],
);

export const submissionKind = pgEnum("submission_kind", ["guest", "sponsored", "press_release"]);
export const submissionStatus = pgEnum("submission_status", ["new", "reviewing", "accepted", "rejected", "published"]);

/** Guest posts, sponsored posts and press releases pitched through /write-for-us. */
export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    kind: submissionKind("kind").default("guest").notNull(),
    status: submissionStatus("status").default("new").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    company: text("company"),
    website: text("website"),
    title: text("title").notNull(),
    /** Pitch or full draft, markdown. */
    body: text("body").notNull(),
    /** Category slug the writer suggested. */
    category: text("category"),
    /** Links the writer wants included (checked for relevance; dofollow only on paid sponsored posts). */
    links: jsonb("links").$type<{ url: string; anchor?: string }[]>().default([]).notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Set when accepted and converted into a draft article. */
    articleId: text("article_id").references(() => articles.id, { onDelete: "set null" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    editorNotes: text("editor_notes"),
    ip: text("ip"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("submissions_status_idx").on(t.status)],
);
