import Link from "next/link";
import { Change } from "@/components/data/change";
import { Sparkline } from "@/components/data/sparkline";
import { JsonLd, SectionHeader } from "@/components/ui";
import { listSeriesWithLatest, recentPointsBySeries } from "@/db/queries/data";
import { formatDate, number } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";

export const revalidate = 600;
export const metadata = buildMetadata({
  title: "Pakistan data: prices and rates, updated",
  description: "Petrol and diesel prices, USD/PKR, gold rate, the SBP policy rate and more, with history, sources and dates. The numbers Pakistanis check every day.",
  path: "/data",
});

/** The hub reads as a desk: fuel, money, metals, markets, rates. Anything unlisted lands in "Other". */
const GROUPS: { title: string; blurb: string; slugs: string[] }[] = [
  { title: "Fuel", blurb: "Government-notified pump prices, revised on the 1st and 16th or sooner.", slugs: ["petrol-price", "diesel-price"] },
  { title: "Currency", blurb: "Interbank rates from the State Bank; the open market runs a few rupees above.", slugs: ["usd-pkr", "aed-pkr", "sar-pkr", "gbp-pkr", "eur-pkr"] },
  { title: "Gold and silver", blurb: "Per tola, from the Karachi Sarafa quote that the rest of the country follows.", slugs: ["gold-24k-tola", "gold-22k-tola", "silver-tola"] },
  { title: "Markets", blurb: "The PSX benchmark and the two largest crypto assets in dollars.", slugs: ["kse-100", "btc-usd", "eth-usd"] },
  { title: "Rates and inflation", blurb: "What loans and savings are priced on, and the CPI the State Bank targets.", slugs: ["sbp-policy-rate", "kibor-1y", "cpi-yoy"] },
  { title: "Energy", blurb: "What a watt of solar costs at the dealer this week.", slugs: ["solar-panel-per-watt"] },
];

const fmt = (unit: string, v: number) => (unit === "%" ? `${number(v, 2)}%` : number(v, Number.isInteger(v) ? 0 : 2));

export default async function DataPage() {
  const [series, recent] = await Promise.all([listSeriesWithLatest(), recentPointsBySeries(30)]);
  const bySlug = new Map(series.map((s) => [s.slug, s]));
  const placed = new Set(GROUPS.flatMap((g) => g.slugs));
  const groups = [...GROUPS.map((g) => ({ ...g, items: g.slugs.map((s) => bySlug.get(s)).filter((s): s is NonNullable<typeof s> => !!s) })), { title: "Other", blurb: "", slugs: [], items: series.filter((s) => !placed.has(s.slug)) }].filter((g) => g.items.length);
  const latestDate = series.reduce<string | null>((acc, s) => (s.latest && (!acc || s.latest.date > acc) ? s.latest.date : acc), null);
  const href = (slug: string) => (slug === "solar-panel-per-watt" ? "/data/solar-panel-price" : `/data/${slug}`);

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Pakistan prices and rates",
          numberOfItems: series.length,
          itemListElement: series.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.name, url: `${SITE.url}${href(s.slug)}` })),
        }}
      />
      <SectionHeader as="h1" title="Data" description="The numbers Pakistanis check every day, recorded with their source and date. Every series has a history, a chart, a JSON and CSV feed, and the calculator it drives." />
      {latestDate ? (
        <p className="mt-2 text-[13px] text-3">
          Latest reading {formatDate(latestDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {series.length} series · automatic sources checked daily, notifications entered the day they are issued
        </p>
      ) : null}

      <div className="mt-8 space-y-10">
        {groups.map((g) => (
          <section key={g.title}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-[var(--rule)] pb-2">
              <h2 className="font-serif text-2xl">{g.title}</h2>
              {g.blurb ? <p className="text-[13.5px] text-3">{g.blurb}</p> : null}
            </div>
            <div className="grid border-l border-t border-line sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((s) => (
                <Link key={s.id} href={href(s.slug)} className="group flex flex-col border-b border-r border-line p-5 hover:bg-surface-2">
                  <p className="text-[14px] font-medium text-2">{s.name.replace(/ in Pakistan/i, "").replace(/ today$/i, "")}</p>
                  {s.latest ? (
                    <>
                      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                        <span className="font-serif text-[2rem] font-medium tabular leading-none tracking-tight">{fmt(s.unit, s.latest.value)}</span>
                        {s.unit !== "%" ? <span className="text-[13px] text-3">{s.unit}</span> : null}
                      </p>
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-3">
                        <Change latest={s.latest.value} previous={s.previous?.value ?? null} unit={s.unit} />
                        <span>{formatDate(s.latest.date)}</span>
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-[15px] text-3">No reading yet</p>
                  )}
                  <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                    <p className="text-[12px] text-3">
                      {s.frequency} · {s.sourceName}
                    </p>
                    {recent[s.id]?.length > 1 ? <Sparkline values={recent[s.id]} className="shrink-0 text-2" /> : null}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12 max-w-[68ch] border-t border-line pt-6 text-[15px] text-2">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-3">How these numbers are recorded</h2>
        <p>Market numbers (currency, gold, silver, the KSE-100, crypto) are fetched from their sources every day and held for review if they move more than 30 percent. Notified prices (fuel, the policy rate, tariffs) are entered the day the notification is issued, with a link to it. Every reading keeps its date, note and source; nothing is estimated, and nothing is back-filled without a source. Each series is available as JSON, CSV and Markdown for reuse with attribution.</p>
      </section>
    </div>
  );
}
