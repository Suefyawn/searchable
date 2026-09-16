import data from "@/content/postal-codes.json";
import { slugify } from "@/lib/slug";

/*
 * Pakistan Post's delivery post offices and their postcodes (2,298 offices under 89 GPO account offices),
 * from pakpost.gov.pk/postcodes.php. Grouped by account office, which is the city people search for
 * ("lahore postal code"). A static file: the list changes a few times a year and the task refreshes it
 * through a pull request, not the database.
 */

export type PostalRow = { office: string; code: string; account: string; province: string; branchCode: string | null };

export const POSTAL_ROWS: PostalRow[] = data.rows as PostalRow[];
export const POSTAL_SOURCE = data.source;
export const POSTAL_FETCHED = data.fetchedAt;

export type PostalGroup = { slug: string; account: string; city: string; province: string; offices: PostalRow[]; codes: { min: string; max: string } };

const groups = new Map<string, PostalGroup>();
for (const r of POSTAL_ROWS) {
  const slug = slugify(r.account.replace(/ GPO$/i, ""));
  let g = groups.get(slug);
  if (!g) {
    g = { slug, account: r.account, city: r.account.replace(/ GPO$/i, ""), province: r.province, offices: [], codes: { min: r.code, max: r.code } };
    groups.set(slug, g);
  }
  g.offices.push(r);
  if (r.code < g.codes.min) g.codes.min = r.code;
  if (r.code > g.codes.max) g.codes.max = r.code;
}
for (const g of groups.values()) g.offices.sort((a, b) => a.office.localeCompare(b.office));

export const POSTAL_GROUPS: PostalGroup[] = [...groups.values()].sort((a, b) => b.offices.length - a.offices.length || a.city.localeCompare(b.city));

export function postalGroup(slug: string): PostalGroup | null {
  return groups.get(slug) ?? null;
}

/** The GPO's own code: the office whose name ends in GPO, else the lowest code in the group. */
export function mainCode(g: PostalGroup): string {
  return g.offices.find((o) => /GPO$/i.test(o.office))?.code ?? g.codes.min;
}
