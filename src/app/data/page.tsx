import Link from "next/link";
import { SectionHeader } from "@/components/ui";
import { listSeriesWithLatest, recentPointsBySeries } from "@/db/queries/data";
import { Sparkline } from "@/components/data/sparkline";
import { formatDate, number } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { Change } from "@/components/data/change";

export const revalidate = 600;
export const metadata = buildMetadata({
  title: "Pakistan data — prices and rates, updated",
  description: "Petrol and diesel prices, USD/PKR, gold rate, the SBP policy rate and more — with history, sources and dates. The numbers Pakistanis check every day.",
  path: "/data",
});

export default async function DataPage() {
  const [series, recent] = await Promise.all([listSeriesWithLatest(), recentPointsBySeries(30)]);
  return (
    <div className="container-x py-8 sm:py-12">
      <SectionHeader as="h1" title="Data" description="The numbers Pakistanis check every day, recorded with their source and date. Each series has a history chart and feeds the relevant calculator." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {series.map((s) => (
          <Link key={s.id} href={s.slug === "solar-panel-per-watt" ? "/data/solar-panel-price" : `/data/${s.slug}`} className="group surface surface-hover p-5 transition-colors">
            <p className="text-sm font-medium text-2">{s.name}</p>
            {s.latest ? (
              <>
                <p className="mt-1 text-3xl font-semibold tabular tracking-tight group-hover:text-brand-800 dark:group-hover:text-brand-200">
                  {s.unit === "%" ? `${number(s.latest.value, 2)}%` : number(s.latest.value, Number.isInteger(s.latest.value) ? 0 : 2)}
                  <span className="ml-1.5 text-sm font-normal text-3">{s.unit !== "%" ? s.unit : ""}</span>
                </p>
                <p className="mt-1 flex items-center gap-2 text-xs text-3">
                  {formatDate(s.latest.date)}
                  <Change latest={s.latest.value} previous={s.previous?.value ?? null} unit={s.unit} />
                </p>
              </>
            ) : (
              <p className="mt-1 text-2">No data yet</p>
            )}
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-xs text-3">
                {s.frequency} · {s.sourceName}
              </p>
              {recent[s.id]?.length > 1 ? <Sparkline values={recent[s.id]} className="shrink-0 text-2" /> : null}
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-8 max-w-2xl text-sm text-3">Values are recorded from official notifications and market associations. Where a figure is quoted by multiple sources (e.g. gold), Searchable records the Karachi Sarafa rate. See each series for its source and revision history.</p>
    </div>
  );
}
