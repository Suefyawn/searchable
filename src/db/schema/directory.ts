import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { users } from "./auth";
import { locations } from "./geo";

export const businessStatus = pgEnum("business_status", ["pending", "active", "closed", "rejected", "duplicate"]);
export const businessTier = pgEnum("business_tier", ["free", "verified", "premium", "sponsored"]);
export const claimStatus = pgEnum("claim_status", ["pending", "approved", "rejected", "expired"]);
/** How ownership was (or will be) proven. invite = clicked the link we emailed to the listed address. */
export const claimMethod = pgEnum("claim_method", ["invite", "email_domain", "phone", "document"]);
export const reviewStatus = pgEnum("review_status", ["pending", "published", "hidden"]);

export const businessCategories = pgTable(
  "business_categories",
  {
    id: id(),
    parentId: text("parent_id").references((): AnyPgColumn => businessCategories.id, { onDelete: "set null" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    namePlural: text("name_plural"),
    description: text("description"),
    icon: text("icon"),
    imageUrl: text("image_url"),
    imageCredit: text("image_credit"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("business_categories_parent_idx").on(t.parentId)],
);

export type SocialLinks = { facebook?: string; instagram?: string; x?: string; linkedin?: string; youtube?: string; tiktok?: string };

export const businesses = pgTable(
  "businesses",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    status: businessStatus("status").default("pending").notNull(),
    tier: businessTier("tier").default("free").notNull(),
    description: text("description"),
    tagline: text("tagline"),
    primaryCategoryId: text("primary_category_id").references(() => businessCategories.id, { onDelete: "set null" }),
    cityId: text("city_id").references(() => locations.id, { onDelete: "set null" }),
    areaId: text("area_id").references(() => locations.id, { onDelete: "set null" }),
    address: text("address"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    website: text("website"),
    social: jsonb("social").$type<SocialLinks>().default({}).notNull(),
    priceRange: integer("price_range"), // 1–4
    ratingAvg: doublePrecision("rating_avg").default(0).notNull(),
    ratingCount: integer("rating_count").default(0).notNull(),
    /** When the paid tier lapses; cron downgrades to free after this. */
    tierExpiresAt: timestamp("tier_expires_at", { withTimezone: true }),
    isVerified: boolean("is_verified").default(false).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Set when a claim is approved; null means the listing is unclaimed and shows the claim invitation. */
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    /** Outreach: when we last emailed the listed address inviting them to claim, and how many times. */
    claimInviteSentAt: timestamp("claim_invite_sent_at", { withTimezone: true }),
    claimInviteCount: integer("claim_invite_count").default(0).notNull(),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    viewCount: integer("view_count").default(0).notNull(),
    clickCount: integer("click_count").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("businesses_city_category_idx").on(t.cityId, t.primaryCategoryId, t.status),
    index("businesses_status_idx").on(t.status),
    index("businesses_phone_idx").on(t.phone),
  ],
);

export const businessCategoryLinks = pgTable(
  "business_category_links",
  {
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => businessCategories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.categoryId] })],
);

export const businessHours = pgTable(
  "business_hours",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** 0 = Sunday … 6 = Saturday */
    dayOfWeek: integer("day_of_week").notNull(),
    opens: text("opens"), // "09:00"
    closes: text("closes"), // "22:00"
    isClosed: boolean("is_closed").default(false).notNull(),
  },
  (t) => [uniqueIndex("business_hours_day_idx").on(t.businessId, t.dayOfWeek)],
);

export const businessServices = pgTable(
  "business_services",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    priceFrom: integer("price_from"),
    priceTo: integer("price_to"),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [index("business_services_business_idx").on(t.businessId)],
);

export const businessPhotos = pgTable(
  "business_photos",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("business_photos_business_idx").on(t.businessId)],
);

export const businessReviews = pgTable(
  "business_reviews",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name"),
    rating: integer("rating").notNull(), // 1–5
    title: text("title"),
    body: text("body"),
    status: reviewStatus("status").default("pending").notNull(),
    ownerResponse: text("owner_response"),
    ownerRespondedAt: timestamp("owner_responded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("business_reviews_business_idx").on(t.businessId, t.status)],
);

export const businessClaims = pgTable(
  "business_claims",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: claimStatus("status").default("pending").notNull(),
    method: claimMethod("method").default("document").notNull(),
    /** owner | manager | staff, as declared by the claimant. */
    role: text("role"),
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    message: text("message"),
    evidenceUrl: text("evidence_url"),
    /** One-time code: emailed to the website domain (email_domain) or to be sent to us from the listed number (phone). */
    verificationCode: text("verification_code"),
    codeExpiresAt: timestamp("code_expires_at", { withTimezone: true }),
    codeAttempts: integer("code_attempts").default(0).notNull(),
    /** Proof received (code matched, invite link used, admin confirmed the call). */
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("business_claims_business_idx").on(t.businessId), uniqueIndex("business_claims_business_user_idx").on(t.businessId, t.userId)],
);

export const businessLeads = pgTable(
  "business_leads",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    message: text("message"),
    source: text("source"), // profile | category_page | search
    createdAt: createdAt(),
  },
  (t) => [index("business_leads_business_idx").on(t.businessId, t.createdAt)],
);
