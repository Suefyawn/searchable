import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { bool, createdAt, enumCheckSql, enumColumn, id, json, textEnum, timestampMs, updatedAt } from "./_shared";
import { users } from "./auth";
import { reviewStatus } from "./directory";
import { locations } from "./geo";

/**
 * People, not shops: doctors, electricians, engineers, architects, lawyers, tutors. A profile is owned by
 * the account that created it (or claimed it), reviewed before it goes live, and can carry a paid Verified badge.
 * Profession slugs come from src/content/professions.ts.
 */
export const professionalStatus = textEnum("professional_status", ["pending", "active", "hidden", "rejected"]);
export const professionalTier = textEnum("professional_tier", ["free", "verified"]);

export type ProfessionalSocial = { linkedin?: string; x?: string; instagram?: string; facebook?: string; github?: string; youtube?: string; tiktok?: string; behance?: string; dribbble?: string };
export type Experience = { title: string; org?: string; from?: string; to?: string; description?: string };
export type Education = { degree: string; institution?: string; year?: string };
export type Certification = { name: string; issuer?: string; year?: string; number?: string };
export type ProService = { name: string; priceFrom?: number; unit?: string };

export const professionals = sqliteTable(
  "professionals",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    ownerUserId: text("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    status: enumColumn("status", professionalStatus).default("pending").notNull(),
    tier: enumColumn("tier", professionalTier).default("free").notNull(),
    tierExpiresAt: timestampMs("tier_expires_at"),
    name: text("name").notNull(),
    professionSlug: text("profession_slug").notNull(),
    /** One line under the name: "Consultant cardiologist, 12 years, Shifa International". */
    headline: text("headline"),
    bio: text("bio"),
    cityId: text("city_id").references(() => locations.id, { onDelete: "set null" }),
    areaId: text("area_id").references(() => locations.id, { onDelete: "set null" }),
    /** Where clients are seen: clinic, office, "home visits in DHA and Gulberg". */
    workplace: text("workplace"),
    serviceMode: text("service_mode"), // in_person | online | both
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    email: text("email"),
    showEmail: bool("show_email").default(false).notNull(),
    website: text("website"),
    social: json("social").$type<ProfessionalSocial>().default({}).notNull(),
    languages: json("languages").$type<string[]>().default([]).notNull(),
    skills: json("skills").$type<string[]>().default([]).notNull(),
    services: json("services").$type<ProService[]>().default([]).notNull(),
    experience: json("experience").$type<Experience[]>().default([]).notNull(),
    education: json("education").$type<Education[]>().default([]).notNull(),
    certifications: json("certifications").$type<Certification[]>().default([]).notNull(),
    yearsExperience: integer("years_experience"),
    /** Registration number with the profession's body (PMDC, PEC, PCATP, Bar Council, ICAP). */
    licenceNo: text("licence_no"),
    availability: text("availability"),
    /** Typical fee or rate, in PKR, with a unit the person chooses (per visit, per hour, per project). */
    rateFrom: integer("rate_from"),
    rateUnit: text("rate_unit"),
    cvUrl: text("cv_url"),
    cvPublic: bool("cv_public").default(true).notNull(),
    photoUrl: text("photo_url"),
    isVerified: bool("is_verified").default(false).notNull(),
    verifiedAt: timestampMs("verified_at"),
    ratingAvg: real("rating_avg").default(0).notNull(),
    ratingCount: integer("rating_count").default(0).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    clickCount: integer("click_count").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("professionals_profession_city_idx").on(t.professionSlug, t.cityId, t.status),
    index("professionals_owner_idx").on(t.ownerUserId),
    index("professionals_status_idx").on(t.status),
    check("professionals_status_check", enumCheckSql("status", professionalStatus)),
    check("professionals_tier_check", enumCheckSql("tier", professionalTier)),
  ],
);

export const professionalLeads = sqliteTable(
  "professional_leads",
  {
    id: id(),
    professionalId: text("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    message: text("message"),
    source: text("source"),
    createdAt: createdAt(),
  },
  (t) => [index("professional_leads_pro_idx").on(t.professionalId, t.createdAt)],
);

/** Client reviews of a professional; same moderation flow as business reviews. */
export const professionalReviews = sqliteTable(
  "professional_reviews",
  {
    id: id(),
    professionalId: text("professional_id")
      .notNull()
      .references(() => professionals.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name"),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body"),
    status: enumColumn("status", reviewStatus).default("pending").notNull(),
    ownerResponse: text("owner_response"),
    ownerRespondedAt: timestampMs("owner_responded_at"),
    createdAt: createdAt(),
  },
  (t) => [index("professional_reviews_pro_idx").on(t.professionalId, t.status), check("professional_reviews_status_check", enumCheckSql("status", reviewStatus))],
);
