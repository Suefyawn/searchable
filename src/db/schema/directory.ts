import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { bool, createdAt, enumCheckSql, enumColumn, id, json, textEnum, timestampMs, updatedAt } from "./_shared";
import { users } from "./auth";
import { locations } from "./geo";

export const businessStatus = textEnum("business_status", ["pending", "active", "closed", "rejected", "duplicate"]);
export const businessTier = textEnum("business_tier", ["free", "verified", "premium", "sponsored"]);
export const claimStatus = textEnum("claim_status", ["pending", "approved", "rejected", "expired"]);
/** How ownership was (or will be) proven. invite = clicked the link we emailed to the listed address. */
export const claimMethod = textEnum("claim_method", ["invite", "email_domain", "phone", "document"]);
export const reviewStatus = textEnum("review_status", ["pending", "published", "hidden"]);

export const businessCategories = sqliteTable(
  "business_categories",
  {
    id: id(),
    parentId: text("parent_id").references((): AnySQLiteColumn => businessCategories.id, { onDelete: "set null" }),
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

export const businesses = sqliteTable(
  "businesses",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    status: enumColumn("status", businessStatus).default("pending").notNull(),
    tier: enumColumn("tier", businessTier).default("free").notNull(),
    description: text("description"),
    tagline: text("tagline"),
    primaryCategoryId: text("primary_category_id").references(() => businessCategories.id, { onDelete: "set null" }),
    cityId: text("city_id").references(() => locations.id, { onDelete: "set null" }),
    areaId: text("area_id").references(() => locations.id, { onDelete: "set null" }),
    address: text("address"),
    lat: real("lat"),
    lng: real("lng"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    website: text("website"),
    social: json("social").$type<SocialLinks>().default({}).notNull(),
    priceRange: integer("price_range"), // 1–4
    ratingAvg: real("rating_avg").default(0).notNull(),
    ratingCount: integer("rating_count").default(0).notNull(),
    /** When the paid tier lapses; cron downgrades to free after this. */
    tierExpiresAt: timestampMs("tier_expires_at"),
    isVerified: bool("is_verified").default(false).notNull(),
    verifiedAt: timestampMs("verified_at"),
    lastVerifiedAt: timestampMs("last_verified_at"),
    ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    /** Set when a claim is approved; null means the listing is unclaimed and shows the claim invitation. */
    claimedAt: timestampMs("claimed_at"),
    /** Outreach: when we last emailed the listed address inviting them to claim, and how many times. */
    claimInviteSentAt: timestampMs("claim_invite_sent_at"),
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
    check("businesses_status_check", enumCheckSql("status", businessStatus)),
    check("businesses_tier_check", enumCheckSql("tier", businessTier)),
  ],
);

export const businessCategoryLinks = sqliteTable(
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

export const businessHours = sqliteTable(
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
    isClosed: bool("is_closed").default(false).notNull(),
  },
  (t) => [uniqueIndex("business_hours_day_idx").on(t.businessId, t.dayOfWeek)],
);

export const businessServices = sqliteTable(
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

export const businessPhotos = sqliteTable(
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

export const businessReviews = sqliteTable(
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
    status: enumColumn("status", reviewStatus).default("pending").notNull(),
    ownerResponse: text("owner_response"),
    ownerRespondedAt: timestampMs("owner_responded_at"),
    createdAt: createdAt(),
  },
  (t) => [index("business_reviews_business_idx").on(t.businessId, t.status), check("business_reviews_status_check", enumCheckSql("status", reviewStatus))],
);

export const businessClaims = sqliteTable(
  "business_claims",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: enumColumn("status", claimStatus).default("pending").notNull(),
    method: enumColumn("method", claimMethod).default("document").notNull(),
    /** owner | manager | staff, as declared by the claimant. */
    role: text("role"),
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    message: text("message"),
    evidenceUrl: text("evidence_url"),
    /** One-time code: emailed to the website domain (email_domain) or to be sent to us from the listed number (phone). */
    verificationCode: text("verification_code"),
    codeExpiresAt: timestampMs("code_expires_at"),
    codeAttempts: integer("code_attempts").default(0).notNull(),
    /** Proof received (code matched, invite link used, admin confirmed the call). */
    verifiedAt: timestampMs("verified_at"),
    decisionNote: text("decision_note"),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestampMs("reviewed_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("business_claims_business_idx").on(t.businessId),
    uniqueIndex("business_claims_business_user_idx").on(t.businessId, t.userId),
    check("business_claims_status_check", enumCheckSql("status", claimStatus)),
    check("business_claims_method_check", enumCheckSql("method", claimMethod)),
  ],
);

export const businessLeads = sqliteTable(
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
