import Link from "next/link";
import { pkr } from "@/lib/format";
import { brandSlug, PRICE_CATEGORY_META, priceRange, type PriceCategory, type PriceItemT } from "@/lib/prices-shared";

/** One row per model: name, the two or three specs buyers scan for, and the price (a range when variants differ). */
export function PriceTable({ category, items, showBrand = true }: { category: PriceCategory; items: PriceItemT[]; showBrand?: boolean }) {
  const meta = PRICE_CATEGORY_META[category];
  const cols = meta.specs.filter((s) => meta.required.includes(s.key) || ["chipset", "camera", "mileage", "transmission"].includes(s.key)).slice(0, 4);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14.5px] tabular">
        <thead>
          <tr className="border-b-2 border-[var(--rule)] text-left text-[12px] uppercase tracking-[0.08em] text-3">
            <th className="py-2 pr-3 font-semibold">Model</th>
            {cols.map((c) => (
              <th key={c.key} className="hidden py-2 pr-3 font-semibold sm:table-cell">
                {c.label}
              </th>
            ))}
            <th className="py-2 text-right font-semibold">Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const r = priceRange(i);
            return (
              <tr key={i.slug} className="border-b border-line">
                <td className="py-2.5 pr-3">
                  <Link href={`/prices/${category}/${i.slug}`} className="font-semibold underline-offset-4 hover:underline">
                    {showBrand ? `${i.brand} ${i.model}` : i.model}
                  </Link>
                  {i.released ? <span className="ml-2 text-[12px] text-3">{i.released.slice(0, 4)}</span> : null}
                </td>
                {cols.map((c) => (
                  <td key={c.key} className="hidden py-2.5 pr-3 text-2 sm:table-cell">
                    {i.specs[c.key] === undefined ? "-" : String(i.specs[c.key])}
                  </td>
                ))}
                <td className="whitespace-nowrap py-2.5 text-right">
                  {pkr(r.min)}
                  {r.max > r.min ? <span className="text-3"> to {pkr(r.max)}</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Brand chips for a category, with counts. */
export function BrandChips({ category, items, active }: { category: PriceCategory; items: PriceItemT[]; active?: string }) {
  const counts = new Map<string, { name: string; n: number }>();
  for (const i of items) {
    const s = brandSlug(i.brand);
    counts.set(s, { name: i.brand, n: (counts.get(s)?.n ?? 0) + 1 });
  }
  const brands = [...counts.entries()].sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name));
  if (!brands.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/prices/${category}`} className={`border px-3 py-1 text-[13.5px] ${!active ? "border-[var(--text)] bg-ink-900 text-white" : "border-line hover:bg-surface-2"}`}>
        All
      </Link>
      {brands.map(([slug, b]) => (
        <Link key={slug} href={`/prices/${category}/${slug}`} className={`border px-3 py-1 text-[13.5px] ${active === slug ? "border-[var(--text)] bg-ink-900 text-white" : "border-line hover:bg-surface-2"}`}>
          {b.name} <span className="opacity-70">{b.n}</span>
        </Link>
      ))}
    </div>
  );
}
