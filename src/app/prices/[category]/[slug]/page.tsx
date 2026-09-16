import Link from "next/link";
import { notFound } from "next/navigation";
import { Img } from "@/components/img";
import { BrandChips, PriceTable } from "@/components/prices/price-table";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { listSeriesWithLatest } from "@/db/queries/data";
import { formatDate, pkr } from "@/lib/format";
import { brandSlug, PRICE_CATEGORIES, PRICE_CATEGORY_META, PRICE_INDEX_MIN, priceRange, readPriceSet, type PriceCategory, type PriceItemT } from "@/lib/prices-data";
import { followRedirect } from "@/lib/redirects";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { SITE } from "@/lib/utils";
import { PTA_MOBILE_TAX, REFERENCE_RATES } from "@/tools/data/rates";

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ category: string; slug: string }> };

function isCategory(c: string): c is PriceCategory {
  return (PRICE_CATEGORIES as readonly string[]).includes(c);
}

async function resolve(category: string, slug: string) {
  if (!isCategory(category)) return null;
  const set = await readPriceSet(category);
  const brandItems = set.items.filter((i) => brandSlug(i.brand) === slug);
  if (brandItems.length) return { kind: "brand" as const, category, set, brand: brandItems[0].brand, items: brandItems.sort((a, b) => a.price - b.price) };
  const item = set.items.find((i) => i.slug === slug);
  if (item) return { kind: "model" as const, category, set, item };
  return null;
}

/** PTA registration tax for a phone bought abroad at this rupee price, on passport and on CNIC. */
function ptaTax(pricePkr: number, usdPkr: number) {
  const valueUsd = pricePkr / usdPkr;
  const pick = (slabs: typeof PTA_MOBILE_TAX.passport) => {
    const slab = slabs.find((s) => s.maxUsd === null || valueUsd <= s.maxUsd) ?? slabs[slabs.length - 1];
    return Math.round(slab.fixedPkr + pricePkr * slab.pctOfValue);
  };
  return { valueUsd: Math.round(valueUsd), passport: pick(PTA_MOBILE_TAX.passport), cnic: pick(PTA_MOBILE_TAX.cnic) };
}

const YEAR = new Date().getFullYear();

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  const r = await resolve(category, slug);
  if (!r) return {};
  const meta = PRICE_CATEGORY_META[r.category];
  if (r.kind === "brand") {
    const prices = r.items.map((i) => i.price);
    return buildMetadata({
      title: `${r.brand} ${meta.name === "Mobile phones" ? "Mobile" : meta.singular.replace(/^\w/, (c) => c.toUpperCase())} Prices in Pakistan ${YEAR}: ${r.items.length} Models, Official List`,
      description: `Every ${r.brand} ${meta.singular} sold in Pakistan with its official price, ${pkr(Math.min(...prices))} to ${pkr(Math.max(...prices))}, specs and price history. Cheapest first.`,
      path: `/prices/${r.category}/${slug}`,
      noindex: r.items.length < 3,
      kicker: meta.name,
    });
  }
  const i = r.item;
  return buildMetadata({
    title: `${i.brand} ${i.model} Price in Pakistan ${YEAR}: ${pkr(i.price)}, Specs${r.category === "mobiles" ? ", PTA Tax" : ""}`,
    description: `${i.brand} ${i.model} costs ${pkr(i.price)} in Pakistan (official price, ${formatDate(i.updatedAt ?? r.set.reviewedAt ?? new Date(), { day: "numeric", month: "long", year: "numeric" })})${i.variants?.length ? `, variants from ${pkr(priceRange(i).min)} to ${pkr(priceRange(i).max)}` : ""}. Full specs${r.category === "mobiles" ? ", PTA tax on passport and CNIC" : ""} and the price history.`,
    path: `/prices/${r.category}/${slug}`,
    kicker: meta.name,
  });
}

export default async function PriceItemPage({ params }: Props) {
  const { category, slug } = await params;
  const r = await resolve(category, slug);
  if (!r) {
    await followRedirect(`/prices/${category}/${slug}`);
    notFound();
  }
  const meta = PRICE_CATEGORY_META[r.category];
  const crumbs = [
    { name: "Prices", path: "/prices" },
    { name: meta.name, path: `/prices/${r.category}` },
  ];

  if (r.kind === "brand") {
    crumbs.push({ name: r.brand, path: `/prices/${r.category}/${slug}` });
    return (
      <div className="container-x py-8 sm:py-12">
        <JsonLd data={breadcrumbJsonLd(crumbs)} />
        <Breadcrumbs items={crumbs} className="mb-4" />
        <SectionHeader as="h1" eyebrow={meta.name} title={`${r.brand} prices in Pakistan`} description={`${r.items.length} ${r.brand} models at the official Pakistan price, cheapest first.`} />
        <div className="mb-6">
          <BrandChips category={r.category} items={r.set.items} active={slug} />
        </div>
        <PriceTable category={r.category} items={r.items} showBrand={false} />
      </div>
    );
  }

  const i = r.item;
  crumbs.push({ name: `${i.brand} ${i.model}`, path: `/prices/${r.category}/${slug}` });
  const range = priceRange(i);
  const usd = (await listSeriesWithLatest()).find((s) => s.slug === "usd-pkr")?.latest?.value ?? REFERENCE_RATES.usdPkr;
  const pta = r.category === "mobiles" ? ptaTax(i.price, usd) : null;
  const siblings = r.set.items.filter((x) => x.slug !== i.slug && brandSlug(x.brand) === brandSlug(i.brand)).sort((a, b) => Math.abs(a.price - i.price) - Math.abs(b.price - i.price)).slice(0, 6);
  const rivals = r.set.items.filter((x) => x.slug !== i.slug && brandSlug(x.brand) !== brandSlug(i.brand) && Math.abs(x.price - i.price) / i.price < 0.15).slice(0, 6);
  const updated = i.updatedAt ?? r.set.updatedAt;
  const firstPrice = i.history[0];
  const lastMove = i.history.length > 1 ? i.history[i.history.length - 2] : null;
  const faqs = [
    { question: `What is the ${i.brand} ${i.model} price in Pakistan?`, answer: `${pkr(i.price)} is the official Pakistan price of the ${i.brand} ${i.model}${i.variants?.length ? ` (base variant; other variants run to ${pkr(range.max)})` : ""}, as listed by ${i.source.publisher ?? i.source.title} on ${formatDate(updated ?? new Date(), { day: "numeric", month: "long", year: "numeric" })}.` },
    ...(lastMove ? [{ question: `Has the ${i.model} price changed?`, answer: `Yes. It was ${pkr(lastMove.price)} on ${formatDate(lastMove.date, { day: "numeric", month: "long", year: "numeric" })} and is ${pkr(i.price)} now, a ${i.price > lastMove.price ? "rise" : "cut"} of ${pkr(Math.abs(i.price - lastMove.price))}.` }] : []),
    ...(pta ? [{ question: `What is the PTA tax on the ${i.model}?`, answer: `Roughly ${pkr(pta.passport)} on a passport (within 60 days of arrival) or ${pkr(pta.cnic)} on a CNIC, from the FBR slab for a phone valued about $${pta.valueUsd}. Units bought in Pakistan at the official price are already PTA approved.` }] : []),
  ];
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${i.brand} ${i.model}`,
    brand: { "@type": "Brand", name: i.brand },
    ...(i.image ? { image: i.image.url } : {}),
    offers: { "@type": "AggregateOffer", priceCurrency: "PKR", lowPrice: range.min, highPrice: range.max, offerCount: 1 + (i.variants?.length ?? 0), availability: "https://schema.org/InStock", url: `${SITE.url}/prices/${r.category}/${slug}` },
  };
  const specRows = meta.specs.filter((s) => i.specs[s.key] !== undefined && i.specs[s.key] !== "");
  const extraSpecs = Object.entries(i.specs).filter(([k]) => !meta.specs.some((s) => s.key === k));
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs), product]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={`${i.brand}${i.released ? ` · on sale since ${formatDate(`${i.released}-01`, { month: "long", year: "numeric" })}` : ""}`} title={`${i.brand} ${i.model} price in Pakistan`} description={i.note ?? `Official Pakistan price, every variant, the specs that matter and how the price has moved.`} />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="grid gap-6 border-y-2 border-[var(--rule)] py-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <p className="eyebrow">Official price</p>
              <p className="mt-1 font-display text-4xl tabular sm:text-5xl">{pkr(i.price)}</p>
              <p className="mt-2 text-[14px] text-2">
                {i.priceNote ?? "Base variant"} · {i.source.url ? <a href={i.source.url} target="_blank" rel="noopener" className="underline underline-offset-4">{i.source.publisher ?? i.source.title}</a> : i.source.title} · {formatDate(updated ?? new Date(), { day: "numeric", month: "short", year: "numeric" })}
              </p>
              {lastMove ? (
                <p className={`mt-1 text-[14px] ${i.price > lastMove.price ? "text-red-700" : "text-emerald-700"}`}>
                  {i.price > lastMove.price ? "Up" : "Down"} {pkr(Math.abs(i.price - lastMove.price))} since {formatDate(lastMove.date, { day: "numeric", month: "short" })}
                </p>
              ) : null}
            </div>
            {i.image ? <Img src={i.image.url} alt={i.image.alt ?? `${i.brand} ${i.model}`} aspect="1/1" fit="contain" width={160} className="w-[160px]" sizes="160px" /> : null}
          </div>

          {i.variants?.length ? (
            <>
              <SectionHeader title="Variants" className="mt-8" />
              <table className="w-full text-[14.5px] tabular">
                <tbody>
                  <tr className="border-b border-line">
                    <td className="py-2 pr-3">Base</td>
                    <td className="py-2 text-right font-semibold">{pkr(i.price)}</td>
                  </tr>
                  {i.variants.map((v) => (
                    <tr key={v.name} className="border-b border-line">
                      <td className="py-2 pr-3">{v.name}</td>
                      <td className="py-2 text-right font-semibold">{pkr(v.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}

          {pta ? (
            <>
              <SectionHeader title="PTA tax if you bring one from abroad" className="mt-8" description={`FBR slab for a phone valued about $${pta.valueUsd} at today's dollar rate (${usd.toFixed(2)}). Units bought in Pakistan are already approved.`} />
              <dl className="grid grid-cols-2 gap-x-6 text-[15px]">
                <div className="border-t border-line py-3">
                  <dt className="text-3">On passport (within 60 days)</dt>
                  <dd className="font-semibold tabular">{pkr(pta.passport)}</dd>
                </div>
                <div className="border-t border-line py-3">
                  <dt className="text-3">On CNIC</dt>
                  <dd className="font-semibold tabular">{pkr(pta.cnic)}</dd>
                </div>
              </dl>
              <p className="mt-1 text-[13px] text-3">
                Exact figure for your IMEI: <Link href="/tools/telecom/pta-mobile-tax-calculator" className="underline underline-offset-4">PTA tax calculator</Link> · <Link href="/pta" className="underline underline-offset-4">PTA approved check</Link>
              </p>
            </>
          ) : null}

          <SectionHeader title="Specifications" className="mt-8" />
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {[...specRows.map((s) => [s.label, i.specs[s.key]] as const), ...extraSpecs.map(([k, v]) => [k.replace(/([A-Z])/g, " $1").replace(/^\w/, (c) => c.toUpperCase()), v] as const)].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-line py-2 text-[15px]">
                <dt className="text-3">{label}</dt>
                <dd className="text-right font-medium">{typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}</dd>
              </div>
            ))}
          </dl>

          {i.history.length > 1 ? (
            <>
              <SectionHeader title="Price history" className="mt-8" description={firstPrice ? `First recorded at ${pkr(firstPrice.price)} on ${formatDate(firstPrice.date, { day: "numeric", month: "short", year: "numeric" })}.` : undefined} />
              <table className="w-full text-[14.5px] tabular">
                <tbody>
                  {[...i.history].reverse().map((h, idx, arr) => {
                    const prev = arr[idx + 1];
                    return (
                      <tr key={h.date} className="border-b border-line">
                        <td className="py-2 pr-3">{formatDate(h.date, { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{pkr(h.price)}</td>
                        <td className={`py-2 text-right text-[13px] ${prev ? (h.price > prev.price ? "text-red-700" : "text-emerald-700") : "text-3"}`}>{prev ? `${h.price > prev.price ? "+" : "-"}${pkr(Math.abs(h.price - prev.price)).replace("Rs ", "Rs ")}` : "first"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : null}

          <SectionHeader title="Questions" className="mt-8" />
          <div className="divide-y divide-[var(--border)] border-y border-line">
            {faqs.map((f) => (
              <details key={f.question} className="py-3">
                <summary className="cursor-pointer list-none font-semibold">{f.question}</summary>
                <p className="mt-2 text-[15px] text-2">{f.answer}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-[13px] text-3">
            Source: <a href={i.source.url} target="_blank" rel="noopener" className="underline underline-offset-4">{i.source.title}</a>
            {i.url ? (
              <>
                {" "}
                · <a href={i.url} target="_blank" rel="noopener" className="underline underline-offset-4">Product page</a>
              </>
            ) : null}
            . Prices are the official list; shops may sell for less.
          </p>
        </div>

        <aside className="space-y-8">
          {siblings.length ? (
            <div>
              <p className="eyebrow">More from {i.brand}</p>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {siblings.map((s) => (
                  <li key={s.slug} className="flex justify-between gap-3">
                    <Link href={`/prices/${r.category}/${s.slug}`} className="underline-offset-4 hover:underline">
                      {s.model}
                    </Link>
                    <span className="tabular text-2">{pkr(s.price)}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/prices/${r.category}/${brandSlug(i.brand)}`} className="mt-2 inline-block text-[14px] font-medium underline-offset-4 hover:underline">
                All {i.brand} →
              </Link>
            </div>
          ) : null}
          {rivals.length ? (
            <div>
              <p className="eyebrow">Same money, other brands</p>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {rivals.map((s) => (
                  <li key={s.slug} className="flex justify-between gap-3">
                    <Link href={`/prices/${r.category}/${s.slug}`} className="underline-offset-4 hover:underline">
                      {s.brand} {s.model}
                    </Link>
                    <span className="tabular text-2">{pkr(s.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <p className="eyebrow">Also useful</p>
            <ul className="mt-2 space-y-1 text-[15px]">
              {r.category === "mobiles" ? (
                <>
                  <li>
                    <Link href="/compare/mobile-packages" className="underline-offset-4 hover:underline">
                      Mobile packages compared
                    </Link>
                  </li>
                  <li>
                    <Link href="/guides/telecom" className="underline-offset-4 hover:underline">
                      SIM, PTA and telecom guides
                    </Link>
                  </li>
                </>
              ) : r.category === "bikes" ? (
                <>
                  <li>
                    <Link href="/data/petrol-price" className="underline-offset-4 hover:underline">
                      Petrol price today
                    </Link>
                  </li>
                  <li>
                    <Link href="/guides/cars" className="underline-offset-4 hover:underline">
                      Registration and licence guides
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/compare/cars" className="underline-offset-4 hover:underline">
                      Compare cars side by side
                    </Link>
                  </li>
                  <li>
                    <Link href="/tools/cars" className="underline-offset-4 hover:underline">
                      Token tax and car finance calculators
                    </Link>
                  </li>
                </>
              )}
              <li>
                <Link href={`/prices/${r.category}`} className="underline-offset-4 hover:underline">
                  All {meta.name.toLowerCase()}
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

export type { PriceItemT };
