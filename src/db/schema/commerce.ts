import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createdAt, enumCheckSql, enumColumn, id, json, textEnum, timestampMs, updatedAt } from "./_shared";
import { users } from "./auth";
import { articles } from "./content";
import { businesses } from "./directory";
import { professionals } from "./professionals";

/**
 * Revenue: paid business plans (verified / premium / sponsored placements) and paid sponsored posts.
 * Payment locally is "manual" (bank transfer / JazzCash / Easypaisa with a reference), marked paid in admin.
 * A card gateway (Safepay / PayFast / Stripe) plugs in as another `provider` without touching the rest.
 */

export const orderKind = textEnum("order_kind", ["business_plan", "sponsored_post", "placement", "professional_plan"]);
export const orderStatus = textEnum("order_status", ["pending", "paid", "active", "expired", "cancelled", "refunded"]);

export const orders = sqliteTable(
  "orders",
  {
    id: id(),
    invoiceNo: text("invoice_no").notNull().unique(),
    kind: enumColumn("kind", orderKind).notNull(),
    /** Plan / product code from src/content/pricing.ts, e.g. verified-annual, premium-monthly, sponsored-post. */
    productCode: text("product_code").notNull(),
    productName: text("product_name").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    businessId: text("business_id").references(() => businesses.id, { onDelete: "set null" }),
    professionalId: text("professional_id").references(() => professionals.id, { onDelete: "set null" }),
    submissionId: text("submission_id"),
    amountPkr: integer("amount_pkr").notNull(),
    status: enumColumn("status", orderStatus).default("pending").notNull(),
    /** manual | jazzcash | easypaisa | safepay | stripe */
    provider: text("provider").default("manual").notNull(),
    /** Payer's transaction reference / screenshot note. */
    paymentReference: text("payment_reference"),
    payerName: text("payer_name"),
    payerEmail: text("payer_email"),
    payerPhone: text("payer_phone"),
    /** What the buyer is paying for, in plain words (e.g. "Featured in Restaurants · Lahore"). */
    notes: text("notes"),
    meta: json("meta").$type<Record<string, unknown>>().default({}).notNull(),
    paidAt: timestampMs("paid_at"),
    startsAt: timestampMs("starts_at"),
    endsAt: timestampMs("ends_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_business_idx").on(t.businessId),
    index("orders_user_idx").on(t.userId),
    check("orders_kind_check", enumCheckSql("kind", orderKind)),
    check("orders_status_check", enumCheckSql("status", orderStatus)),
  ],
);

export const submissionKind = textEnum("submission_kind", ["guest", "sponsored", "press_release"]);
export const submissionStatus = textEnum("submission_status", ["new", "reviewing", "accepted", "rejected", "published"]);

/** Guest posts, sponsored posts and press releases pitched through /write-for-us. */
export const submissions = sqliteTable(
  "submissions",
  {
    id: id(),
    kind: enumColumn("kind", submissionKind).default("guest").notNull(),
    status: enumColumn("status", submissionStatus).default("new").notNull(),
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
    links: json("links").$type<{ url: string; anchor?: string }[]>().default([]).notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Set when accepted and converted into a draft article. */
    articleId: text("article_id").references(() => articles.id, { onDelete: "set null" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    editorNotes: text("editor_notes"),
    ip: text("ip"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("submissions_status_idx").on(t.status),
    check("submissions_kind_check", enumCheckSql("kind", submissionKind)),
    check("submissions_status_check", enumCheckSql("status", submissionStatus)),
  ],
);
