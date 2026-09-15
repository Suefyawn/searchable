import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, rawQuery, schema } from "@/db";
import { getProfession, PROFESSIONS } from "@/content/professions";
import { removeSearchDocument, syncSearchDocument } from "./search";
import type { ProfessionalFormInput } from "./professional-schema";

/** Read side for professional profiles: hub, lists, profile, owner dashboard. */

export type ProfessionalCard = {
  id: string;
  slug: string;
  name: string;
  professionSlug: string;
  headline: string | null;
  photoUrl: string | null;
  isVerified: boolean;
  tier: string;
  yearsExperience: number | null;
  rateFrom: number | null;
  rateUnit: string | null;
  serviceMode: string | null;
  city: { name: string; slug: string } | null;
  area: { name: string } | null;
  skills: string[];
  ratingAvg: number;
  ratingCount: number;
};

const cardWith = { city: { columns: { name: true, slug: true } }, area: { columns: { name: true } } } as const;

export async function listProfessionals(opts: { profession?: string; citySlug?: string; limit?: number; offset?: number; verifiedFirst?: boolean } = {}) {
  const db = await getDb();
  let cityId: string | undefined;
  if (opts.citySlug) {
    const city = await db.query.locations.findFirst({ where: and(eq(schema.locations.slug, opts.citySlug), eq(schema.locations.kind, "city")), columns: { id: true } });
    if (!city) return { rows: [] as ProfessionalCard[], total: 0 };
    cityId = city.id;
  }
  const where = and(eq(schema.professionals.status, "active"), opts.profession ? eq(schema.professionals.professionSlug, opts.profession) : undefined, cityId ? eq(schema.professionals.cityId, cityId) : undefined);
  const [rows, total] = await Promise.all([
    db.query.professionals.findMany({
      where,
      with: cardWith,
      orderBy: [desc(schema.professionals.isVerified), desc(schema.professionals.ratingCount), desc(schema.professionals.viewCount), asc(schema.professionals.name)],
      limit: Math.min(opts.limit ?? 40, 100),
      offset: opts.offset ?? 0,
    }),
    db.$count(schema.professionals, where),
  ]);
  return { rows: rows as unknown as ProfessionalCard[], total };
}

export async function getProfessional(slug: string) {
  const db = await getDb();
  return db.query.professionals.findFirst({ where: eq(schema.professionals.slug, slug), with: { city: true, area: true, reviews: { where: eq(schema.professionalReviews.status, "published"), orderBy: [desc(schema.professionalReviews.createdAt)], limit: 30 } } });
}
export async function getProfessionalById(id: string) {
  const db = await getDb();
  return db.query.professionals.findFirst({ where: eq(schema.professionals.id, id), with: { city: true, area: true } });
}

/** Counts per profession (active), for the hub and the mega menu. */
export async function professionCounts(): Promise<{ slug: string; name: string; plural: string; group: string; count: number }[]> {
  const db = await getDb();
  const rows = await rawQuery<{ slug: string; n: number }>(db, sql`select profession_slug as slug, count(*)::int as n from professionals where status = 'active' group by profession_slug`);
  const map = new Map(rows.map((r) => [r.slug, Number(r.n)]));
  return PROFESSIONS.map((p) => ({ slug: p.slug, name: p.name, plural: p.plural, group: p.group, count: map.get(p.slug) ?? 0 }));
}

/** Cities with active profiles, most first. */
export async function professionalCities(profession?: string, limit = 12) {
  const db = await getDb();
  return rawQuery<{ slug: string; name: string; n: number }>(
    db,
    sql`select l.slug, l.name, count(*)::int as n from professionals p join locations l on l.id = p.city_id
        where p.status = 'active' ${profession ? sql`and p.profession_slug = ${profession}` : sql``}
        group by l.slug, l.name order by n desc, l.name asc limit ${limit}`,
  );
}

export async function professionalsForUser(userId: string) {
  const db = await getDb();
  return db.query.professionals.findMany({ where: eq(schema.professionals.ownerUserId, userId), with: { city: true, area: true, leads: { orderBy: [desc(schema.professionalLeads.createdAt)], limit: 10 }, reviews: { orderBy: [desc(schema.professionalReviews.createdAt)], limit: 10 } }, orderBy: [desc(schema.professionals.createdAt)] });
}

/** Editor initial values from a row. */
export function toFormInput(p: NonNullable<Awaited<ReturnType<typeof getProfessionalById>>>): ProfessionalFormInput {
  return {
    id: p.id,
    name: p.name,
    professionSlug: p.professionSlug,
    headline: p.headline ?? undefined,
    bio: p.bio ?? undefined,
    cityId: p.cityId ?? undefined,
    areaId: p.areaId ?? undefined,
    workplace: p.workplace ?? undefined,
    serviceMode: (p.serviceMode as "in_person" | "online" | "both" | null) ?? undefined,
    phone: p.phone ?? undefined,
    whatsapp: p.whatsapp ?? undefined,
    email: p.email ?? undefined,
    showEmail: p.showEmail,
    website: p.website ?? undefined,
    linkedin: p.social.linkedin,
    x: p.social.x,
    instagram: p.social.instagram,
    facebook: p.social.facebook,
    github: p.social.github,
    youtube: p.social.youtube,
    tiktok: p.social.tiktok,
    behance: p.social.behance,
    languages: p.languages,
    skills: p.skills,
    services: p.services,
    experience: p.experience,
    education: p.education,
    certifications: p.certifications,
    yearsExperience: p.yearsExperience ?? undefined,
    licenceNo: p.licenceNo ?? undefined,
    availability: p.availability ?? undefined,
    rateFrom: p.rateFrom ?? undefined,
    rateUnit: p.rateUnit ?? undefined,
    cvUrl: p.cvUrl ?? undefined,
    cvPublic: p.cvPublic,
    photoUrl: p.photoUrl ?? undefined,
  };
}

/** Search document for a profile; removed when not active. */
export async function indexProfessional(id: string) {
  const db = await getDb();
  const p = await db.query.professionals.findFirst({ where: eq(schema.professionals.id, id), with: { city: true, area: true } });
  if (!p) return;
  if (p.status !== "active") {
    await removeSearchDocument("professional", p.id);
    return;
  }
  const prof = getProfession(p.professionSlug);
  await syncSearchDocument({
    entityType: "professional",
    entityId: p.id,
    url: `/p/${p.slug}`,
    title: `${p.name}, ${prof?.name ?? p.professionSlug}${p.city ? ` in ${p.city.name}` : ""}`,
    summary: p.headline ?? [prof?.name, p.workplace, p.city?.name].filter(Boolean).join(" · "),
    body: [p.bio, p.skills.join(", "), p.services.map((s) => s.name).join(", "), p.experience.map((e) => `${e.title} ${e.org ?? ""}`).join("; "), p.education.map((e) => `${e.degree} ${e.institution ?? ""}`).join("; ")].filter(Boolean).join("\n"),
    keywords: [prof?.name, prof?.plural, ...(prof?.keywords ?? []), p.area?.name, "near me", p.serviceMode === "online" || p.serviceMode === "both" ? "online" : null].filter(Boolean).join(", "),
    category: prof?.name ?? null,
    categorySlug: p.professionSlug,
    city: p.city?.name ?? null,
    citySlug: p.city?.slug ?? null,
    imageUrl: p.photoUrl,
    popularity: p.viewCount + p.ratingCount * 5 + (p.isVerified ? 50 : 0),
    meta: { verified: p.isVerified, rating: p.ratingAvg, ratingCount: p.ratingCount, phone: p.phone, whatsapp: p.whatsapp, profession: p.professionSlug },
  });
}
