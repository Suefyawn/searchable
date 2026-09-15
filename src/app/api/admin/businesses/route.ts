import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ApiError, qs, withAdminApi } from "@/lib/admin-api";
import { commitImport, IMPORT_COLUMNS, previewImport } from "@/lib/import";

export const dynamic = "force-dynamic";

/** GET /api/admin/businesses?status=active|pending|all&city=&category=&q=&limit= */
export const GET = withAdminApi(async (req) => {
  const q = qs(req);
  const status = q.str("status", "all")!;
  const text = q.str("q");
  const db = await getDb();
  const conds = [];
  if (status !== "all") conds.push(eq(schema.businesses.status, status as (typeof schema.businessStatus.enumValues)[number]));
  if (text) conds.push(sql`${schema.businesses.name} ilike ${"%" + text + "%"}`);
  const rows = await db.query.businesses.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: [desc(schema.businesses.updatedAt)],
    limit: q.int("limit", 50, 200),
    columns: { id: true, slug: true, name: true, status: true, phone: true, whatsapp: true, website: true, email: true, address: true, isVerified: true, ownerUserId: true, claimedAt: true, updatedAt: true },
    with: { city: { columns: { slug: true, name: true } }, primaryCategory: { columns: { slug: true, name: true } } },
  });
  return { businesses: rows.map((b) => ({ ...b, url: `/b/${b.slug}` })) };
});

const Row = z.object({
  name: z.string().min(2).max(120),
  /** Business category slug or a common alias (restaurant, dentist, solar). */
  category: z.string().min(1),
  city: z.string().min(1),
  area: z.string().optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  website: z.string().max(200).optional(),
  email: z.string().max(120).optional(),
  description: z.string().max(3000).optional(),
  tagline: z.string().max(160).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  /** "09:00" and "21:00"; closedDays like "sunday" or "friday,sunday". */
  opens: z.string().optional(),
  closes: z.string().optional(),
  closedDays: z.string().optional(),
  services: z.array(z.string()).max(20).optional(),
  /** 1 to 4 (Rs to Rs Rs Rs Rs). */
  priceRange: z.number().int().min(1).max(4).optional(),
});
const Body = z.object({ businesses: z.array(Row).min(1).max(200), publish: z.boolean().default(true), includeDuplicates: z.boolean().default(false) });

function csvCell(v: unknown) {
  const s = v === undefined || v === null ? "" : Array.isArray(v) ? v.join("|") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * POST /api/admin/businesses { businesses: [...], publish?: true, includeDuplicates?: false }
 * Same pipeline as the CSV importer: categories and cities resolved by slug or alias, phones normalised,
 * duplicates (same name in the same city, or same phone) reported and skipped unless asked otherwise.
 */
export const POST = withAdminApi(async (_req, { user, body }) => {
  const d = Body.parse(body);
  const header = IMPORT_COLUMNS.join(",");
  const lines = d.businesses.map((b) =>
    [b.name, b.category, b.city, b.area, b.address, b.phone, b.whatsapp, b.website, b.email, b.description, b.tagline, b.lat, b.lng, b.opens, b.closes, b.closedDays, b.services, b.priceRange].map(csvCell).join(","),
  );
  const preview = await previewImport(`${header}\n${lines.join("\n")}`);
  if (preview.error) throw new ApiError(400, preview.error);
  const result = await commitImport(preview.rows, { publish: d.publish, includeDuplicates: d.includeDuplicates, source: `api:${user.email}` });
  revalidatePath("/businesses");
  revalidatePath("/admin/businesses");
  return {
    ok: true,
    created: result.created.map((c) => ({ ...c, url: `/b/${c.slug}` })),
    skipped: preview.rows.filter((r) => r.status !== "new").map((r) => ({ line: r.line, name: r.input.name, status: r.status, problems: r.problems, duplicates: r.duplicates.map((x) => x.slug) })),
  };
});
