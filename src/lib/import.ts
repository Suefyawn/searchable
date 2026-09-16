import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { findDuplicates, normalizePhone, type DuplicateMatch } from "./dedupe";
import { indexBusiness } from "./indexers";
import { slugify, uniqueSlug } from "./slug";

/**
 * Bulk import pipeline: CSV → parse → validate → resolve category/city/area → normalise → dedupe → preview → commit.
 * Rows never go live silently: they land as `pending` unless the editor ticks "publish immediately".
 */

export const IMPORT_COLUMNS = ["name", "category", "city", "area", "address", "phone", "whatsapp", "website", "email", "description", "tagline", "lat", "lng", "opens", "closes", "closed_days", "services", "price_range"] as const;

export const TEMPLATE_CSV = `${IMPORT_COLUMNS.join(",")}
"Bundu Khan","restaurants","lahore","gulberg","MM Alam Road, Gulberg III","042-35878888","0300-1234567","https://bundukhan.com","","Lahore's classic barbecue, tikka, kebab and karahi since 1948.","Barbecue since 1948",31.5145,74.3483,"12:00","23:30","","Dine-in;Takeaway;Home delivery",3
"Dr Amina Clinic","doctors","karachi","clifton","Block 2, Clifton","021-35837000","","","","Family physician, walk-in and appointments.","",24.8138,67.0304,"10:00","20:00","Sun","Consultation;Vaccination",2
`;

const Row = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(1),
  city: z.string().trim().min(1),
  area: z.string().trim().optional().default(""),
  address: z.string().trim().max(300).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  whatsapp: z.string().trim().max(30).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  description: z.string().trim().max(3000).optional().default(""),
  tagline: z.string().trim().max(160).optional().default(""),
  lat: z.string().trim().optional().default(""),
  lng: z.string().trim().optional().default(""),
  opens: z.string().trim().optional().default(""),
  closes: z.string().trim().optional().default(""),
  closed_days: z.string().trim().optional().default(""),
  services: z.string().trim().optional().default(""),
  price_range: z.string().trim().optional().default(""),
});

/** RFC-4180-ish CSV parser: quotes, escaped quotes, CRLF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const DAY_INDEX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export type PreviewRow = {
  line: number;
  input: z.infer<typeof Row>;
  status: "new" | "duplicate" | "invalid";
  problems: string[];
  resolved?: { categoryId: string; categoryName: string; cityId: string; cityName: string; areaId: string | null; areaName: string | null; phone: string | null; whatsapp: string | null; website: string | null; lat: number | null; lng: number | null; hours: { dayOfWeek: number; opens: string | null; closes: string | null; isClosed: boolean }[]; services: string[]; priceRange: number | null; slug: string };
  duplicates: DuplicateMatch[];
};

const CATEGORY_ALIASES: Record<string, string> = { restaurant: "restaurants", food: "restaurants", cafe: "cafes", coffee: "cafes", doctor: "doctors", physician: "doctors", hospital: "hospitals", pharmacy: "pharmacies", "medical store": "pharmacies", dentist: "dentists", lawyer: "lawyers", advocate: "lawyers", "tax consultant": "tax-consultants", accountant: "tax-consultants", "solar company": "solar-companies", solar: "solar-companies", electrician: "electricians", plumber: "plumbers", "car dealer": "car-dealers", showroom: "car-dealers", workshop: "car-workshops", mechanic: "car-workshops", "mobile shop": "mobile-shops", "real estate": "real-estate-agents", "property dealer": "real-estate-agents", school: "schools", university: "universities", gym: "gyms", salon: "salons", parlour: "salons", hotel: "hotels", bank: "banks", photographer: "photographers", "wedding hall": "wedding-halls", marquee: "wedding-halls", tailor: "tailors", "it company": "it-companies", software: "it-companies" };

/** "Mayo Hospital Lahore" in Lahore is mayo-hospital-lahore, not mayo-hospital-lahore-lahore. */
export function businessSlug(name: string, citySlug: string): string {
  const base = slugify(name);
  return base.endsWith(`-${citySlug}`) || base === citySlug ? base : slugify(`${base}-${citySlug}`);
}

export async function previewImport(csv: string): Promise<{ rows: PreviewRow[]; header: string[]; error?: string }> {
  const table = parseCsv(csv);
  if (table.length < 2) return { rows: [], header: [], error: "Need a header row and at least one data row." };
  const header = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  if (!header.includes("name") || !header.includes("category") || !header.includes("city")) return { rows: [], header, error: "Header must include name, category and city. Download the template." };

  const db = await getDb();
  const [categories, cities] = await Promise.all([db.query.businessCategories.findMany({ columns: { id: true, slug: true, name: true, namePlural: true } }), db.query.locations.findMany({ where: eq(schema.locations.kind, "city"), columns: { id: true, slug: true, name: true } })]);
  const areasByCity = new Map<string, { id: string; slug: string; name: string }[]>();
  const areas = await db.query.locations.findMany({ where: eq(schema.locations.kind, "area"), columns: { id: true, slug: true, name: true, cityId: true } });
  for (const a of areas) if (a.cityId) (areasByCity.get(a.cityId) ?? areasByCity.set(a.cityId, []).get(a.cityId)!).push(a);

  const findCategory = (v: string) => {
    const k = v.trim().toLowerCase();
    const alias = CATEGORY_ALIASES[k];
    return categories.find((c) => c.slug === k || c.slug === alias || c.name.toLowerCase() === k || c.namePlural?.toLowerCase() === k || slugify(k) === c.slug);
  };
  const findCity = (v: string) => {
    const k = v.trim().toLowerCase();
    return cities.find((c) => c.slug === k || c.name.toLowerCase() === k || slugify(k) === c.slug);
  };

  const seenInFile = new Map<string, number>();
  const rows: PreviewRow[] = [];
  for (let i = 1; i < table.length; i++) {
    const rec = Object.fromEntries(header.map((h, j) => [h, table[i][j] ?? ""]));
    const parsed = Row.safeParse(rec);
    if (!parsed.success) {
      rows.push({ line: i + 1, input: rec as z.infer<typeof Row>, status: "invalid", problems: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`), duplicates: [] });
      continue;
    }
    const d = parsed.data;
    const problems: string[] = [];
    const category = findCategory(d.category);
    if (!category) problems.push(`Unknown category "${d.category}"`);
    const city = findCity(d.city);
    if (!city) problems.push(`Unknown city "${d.city}"`);
    const area = city && d.area ? (areasByCity.get(city.id) ?? []).find((a) => a.slug === slugify(d.area) || a.name.toLowerCase() === d.area.toLowerCase()) : undefined;
    if (city && d.area && !area) problems.push(`Area "${d.area}" not found in ${city.name}, will import without area`);
    const phone = normalizePhone(d.phone);
    if (d.phone && !phone) problems.push(`Phone "${d.phone}" is not a valid Pakistani number`);
    const whatsapp = normalizePhone(d.whatsapp);
    const lat = d.lat ? Number(d.lat) : null;
    const lng = d.lng ? Number(d.lng) : null;
    if ((lat !== null && (Number.isNaN(lat) || lat < 23 || lat > 38)) || (lng !== null && (Number.isNaN(lng) || lng < 60 || lng > 78))) problems.push("Coordinates are outside Pakistan");
    const website = d.website ? (/^https?:\/\//i.test(d.website) ? d.website : `https://${d.website}`) : null;
    const closed = new Set(d.closed_days.split(/[;,\s]+/).map((x) => DAY_INDEX[x.slice(0, 3).toLowerCase()]).filter((x) => x !== undefined));
    const hours = d.opens && d.closes ? Array.from({ length: 7 }, (_, dow) => ({ dayOfWeek: dow, opens: closed.has(dow) ? null : d.opens, closes: closed.has(dow) ? null : d.closes, isClosed: closed.has(dow) })) : [];
    const services = d.services.split(/[;|]/).map((s) => s.trim()).filter(Boolean).slice(0, 40);
    const priceRange = d.price_range ? Math.min(4, Math.max(1, parseInt(d.price_range, 10) || 0)) || null : null;

    const fatal = !category || !city || problems.some((p) => p.startsWith("Phone") || p.startsWith("Coordinates"));
    let duplicates: DuplicateMatch[] = [];
    if (!fatal && city) {
      duplicates = await findDuplicates({ name: d.name, phone: d.phone, whatsapp: d.whatsapp, cityId: city.id, cityName: city.name, lat, lng });
      const fileKey = `${city.id}:${slugify(d.name)}`;
      if (seenInFile.has(fileKey)) problems.push(`Same name appears on line ${seenInFile.get(fileKey)} of this file`);
      seenInFile.set(fileKey, i + 1);
    }
    rows.push({
      line: i + 1,
      input: d,
      status: fatal ? "invalid" : duplicates.length ? "duplicate" : "new",
      problems,
      resolved: category && city ? { categoryId: category.id, categoryName: category.namePlural ?? category.name, cityId: city.id, cityName: city.name, areaId: area?.id ?? null, areaName: area?.name ?? null, phone, whatsapp, website, lat: Number.isFinite(lat as number) ? lat : null, lng: Number.isFinite(lng as number) ? lng : null, hours, services, priceRange, slug: businessSlug(d.name, city.slug) } : undefined,
      duplicates,
    });
  }
  return { rows, header };
}

/** Insert the selected preview rows. Returns created slugs. */
export async function commitImport(rows: PreviewRow[], opts: { publish: boolean; includeDuplicates: boolean; source: string }): Promise<{ created: { slug: string; name: string }[]; skipped: number }> {
  const db = await getDb();
  const created: { slug: string; name: string }[] = [];
  let skipped = 0;
  for (const r of rows) {
    if (!r.resolved || r.status === "invalid" || (r.status === "duplicate" && !opts.includeDuplicates)) {
      skipped++;
      continue;
    }
    const slug = await uniqueSlug(r.resolved.slug, async (s) => !!(await db.query.businesses.findFirst({ where: eq(schema.businesses.slug, s), columns: { id: true } })));
    const [row] = await db
      .insert(schema.businesses)
      .values({
        slug,
        name: r.input.name,
        status: opts.publish ? "active" : "pending",
        description: r.input.description || null,
        tagline: r.input.tagline || null,
        primaryCategoryId: r.resolved.categoryId,
        cityId: r.resolved.cityId,
        areaId: r.resolved.areaId,
        address: r.input.address || null,
        lat: r.resolved.lat,
        lng: r.resolved.lng,
        phone: r.resolved.phone,
        whatsapp: r.resolved.whatsapp,
        email: r.input.email || null,
        website: r.resolved.website,
        priceRange: r.resolved.priceRange,
      })
      .returning({ id: schema.businesses.id });
    if (r.resolved.hours.length) await db.insert(schema.businessHours).values(r.resolved.hours.map((h) => ({ businessId: row.id, ...h })));
    if (r.resolved.services.length) await db.insert(schema.businessServices).values(r.resolved.services.map((name, i) => ({ businessId: row.id, name, sortOrder: i })));
    await db.insert(schema.businessCategoryLinks).values({ businessId: row.id, categoryId: r.resolved.categoryId }).onConflictDoNothing();
    if (opts.publish) await indexBusiness(row.id);
    created.push({ slug, name: r.input.name });
  }
  return { created, skipped };
}

/** Does a business with a similar name already exist in this city? (used by the public add form) */
export async function quickDuplicateCheck(name: string, cityId: string, phone?: string) {
  const db = await getDb();
  const city = await db.query.locations.findFirst({ where: eq(schema.locations.id, cityId), columns: { name: true } });
  return findDuplicates({ name, phone, cityId, cityName: city?.name });
}

