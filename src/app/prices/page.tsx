import Link from "next/link";
import { JsonLd, SectionHeader } from "@/components/ui";
import { formatDate, pkr } from "@/lib/format";
import { PRICE_CATEGORIES, PRICE_CATEGORY_META, PRICE_INDEX_MIN, readPriceSet } from "@/lib/prices-data";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const revalidate = 3600;
export const metadata = buildMetadata({
  title: "Prices in Pakistan 2026: Mobiles, Bikes and Cars, Official Rates",
  description: "Official Pakistan prices for every current mobile phone, motorcycle and car model, from the makers' price lists, with specs, PTA tax and price history. Updated as prices change.",
  path: "/prices",
  kicker: "Prices",
});

export default async function PricesHub() {
  const sets = await Promise.all(PRICE_CATEGORIES.map(async (c) => ({ category: c, meta: PRICE_CATEGORY_META[c], set: await readPriceSet(c) })));
  const crumbs = [{ name: "Prices", path: "/prices" }];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <SectionHeader as="h1" eyebrow="Prices" title="Prices in Pakistan" description="What each model costs today from the maker's own Pakistan price list, with the specs that matter and the price it used to be." />
      <div className="grid gap-px border border-line bg-[var(--border)] sm:grid-cols-3">
        {sets.map(({ category, meta, set }) => {
          const prices = set.items.map((i) => i.price);
          const brands = new Set(set.items.map((i) => i.brand)).size;
          return (
            <Link key={category} href={`/prices/${category}`} className="bg-[var(--bg)] p-6 hover:bg-surface-2">
              <p className="eyebrow">{meta.name}</p>
              <p className="mt-1 font-display text-2xl">{meta.query.replace(/^\w/, (c) => c.toUpperCase())}</p>
              <p className="mt-2 text-[14.5px] text-2">{set.items.length >= PRICE_INDEX_MIN ? `${set.items.length} models from ${brands} brands, ${pkr(Math.min(...prices))} to ${pkr(Math.max(...prices))}.` : set.items.length ? `${set.items.length} models so far; the list is being compiled.` : "Being compiled from official price lists."}</p>
              {set.reviewedAt ? <p className="mt-2 text-[12.5px] text-3">Reviewed {formatDate(set.reviewedAt, { day: "numeric", month: "short", year: "numeric" })}</p> : null}
            </Link>
          );
        })}
      </div>
      <p className="mt-6 max-w-[70ch] text-[14.5px] text-2">
        Every price is the maker&apos;s official Pakistan price (or an authorised seller&apos;s) on the review date, base variant first, other variants on the model page. Retail shops can sell a little below the list price; imported and grey-market units are not covered. Related: <Link href="/compare/cars" className="underline underline-offset-4">compare cars</Link>, <Link href="/compare/mobile-packages" className="underline underline-offset-4">mobile packages</Link>, <Link href="/pta" className="underline underline-offset-4">PTA tax and IMEI check</Link>.
      </p>
    </div>
  );
}
