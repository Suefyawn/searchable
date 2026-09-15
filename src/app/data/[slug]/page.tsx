import Link from "next/link";
import { AdSlot } from "@/components/ads";
import { notFound } from "next/navigation";
import { Change } from "@/components/data/change";
import { GoldExtras } from "@/components/data/gold-extras";
import { LineChart } from "@/components/data/line-chart";
import { ToolCard } from "@/components/cards";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { getSeries, seriesStats } from "@/db/queries/data";
import { getEntitiesBySlugs } from "@/db/queries/entities";
import { formatDate, number } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";
import { getTool } from "@/tools/registry";

export const revalidate = 600;
type Props = { params: Promise<{ slug: string }> };

/** Which calculators and topics each series feeds. Extend as tools are added. */
const LINKS: Record<string, { tools?: string[]; entities?: string[] }> = {
  "petrol-price": { tools: ["fuel-cost-calculator"], entities: ["petrol", "ogra"] },
  "diesel-price": { tools: ["fuel-cost-calculator"], entities: ["petrol", "ogra"] },
  "usd-pkr": { tools: ["pta-mobile-tax-calculator"], entities: ["usd-pkr", "sbp"] },
  "gold-24k-tola": { tools: ["zakat-calculator"], entities: ["gold"] },
  "sbp-policy-rate": { tools: ["car-loan-calculator", "home-loan-calculator"], entities: ["sbp"] },
  "kibor-1y": { tools: ["car-loan-calculator", "home-loan-calculator"], entities: ["sbp", "meezan-bank", "hbl"] },
  "cpi-yoy": { tools: ["salary-breakdown-calculator"], entities: ["sbp"] },
  "gold-22k-tola": { tools: ["zakat-calculator"], entities: ["gold"] },
  "silver-tola": { tools: ["zakat-calculator"], entities: ["gold"] },
  "eur-pkr": { tools: [], entities: ["usd-pkr", "sbp"] },
  "gbp-pkr": { tools: [], entities: ["usd-pkr", "sbp"] },
  "aed-pkr": { tools: [], entities: ["usd-pkr", "sbp"] },
  "sar-pkr": { tools: [], entities: ["usd-pkr", "sbp"] },
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await getSeries(slug, 1);
  if (!data) return {};
  const latest = data.points[data.points.length - 1];
  const value = latest ? (data.series.unit === "%" ? `${number(latest.value, 2)}%` : `${number(latest.value, Number.isInteger(latest.value) ? 0 : 2)} ${data.series.unit}`) : "";
  return buildMetadata({
    title: `${/today/i.test(data.series.name) ? data.series.name : `${data.series.name} today`}${value ? ` — ${value}` : ""}`,
    description: `${data.series.name} in Pakistan with history, source (${data.series.sourceName ?? "official"}) and the date of every change. Updated ${data.series.frequency}.`,
    path: `/data/${slug}`,
  });
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const data = await getSeries(slug, 365);
  if (!data) notFound();
  const { series, points } = data;
  const [stats, entities] = await Promise.all([seriesStats(series.id), getEntitiesBySlugs(LINKS[slug]?.entities ?? [])]);
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const tools = (LINKS[slug]?.tools ?? []).map(getTool).filter((t): t is NonNullable<typeof t> => !!t);
  const fmt = (v: number) => (series.unit === "%" ? `${number(v, 2)}%` : number(v, Number.isInteger(v) ? 0 : 2));
  const crumbs = [{ name: "Data", path: "/data" }, { name: series.name, path: `/data/${slug}` }];
  const recent = [...points].reverse().slice(0, 30);

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: `${series.name} (Pakistan)`,
            description: series.description ?? `${series.name}, recorded ${series.frequency} from ${series.sourceName}.`,
            url: `${SITE.url}/data/${slug}`,
            creator: { "@type": "Organization", name: SITE.name },
            temporalCoverage: stats?.first && stats?.last ? `${stats.first}/${stats.last}` : undefined,
            distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE.url}/api/data/${slug}` }],
          },
        ]}
      />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <AdSlot name="leaderboard" className="my-4" />
      <SectionHeader as="h1" title={series.name} description={series.description ?? `Recorded ${series.frequency} from ${series.sourceName ?? "the official source"}.`} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="surface p-6">
            <p className="text-sm text-2">Latest{latest ? ` · ${formatDate(latest.date)}` : ""}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-semibold tabular tracking-tight sm:text-5xl">{latest ? fmt(latest.value) : "—"}</span>
              {latest && series.unit !== "%" ? <span className="text-lg text-3">{series.unit}</span> : null}
              {latest && previous ? <Change latest={latest.value} previous={previous.value} unit={series.unit} /> : null}
            </p>
            {previous ? <p className="mt-1 text-sm text-3">Previous: {fmt(previous.value)} on {formatDate(previous.date)}</p> : null}
          </div>
          <div className="surface p-5 text-brand-700">
            <LineChart points={points.map((p) => ({ date: p.date, value: p.value }))} unit={series.unit} />
          </div>
          {(slug === "gold-24k-tola" || slug === "gold-22k-tola") && latest ? <GoldExtras slug={slug} latestPerTola={latest.value} date={latest.date} /> : null}

          <section>
            <h2 className="mb-3 text-lg font-semibold">History</h2>
            <div className="surface overflow-x-auto">
              <table className="w-full text-[15px]">
                <thead className="text-left text-xs uppercase tracking-wider text-3">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 text-right font-medium">Value</th>
                    <th className="px-4 py-2 text-right font-medium">Change</th>
                    <th className="px-4 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {recent.map((p, i) => {
                    const prev = recent[i + 1];
                    return (
                      <tr key={p.id}>
                        <td className="px-4 py-2">{formatDate(p.date)}</td>
                        <td className="px-4 py-2 text-right tabular font-medium">{fmt(p.value)}</td>
                        <td className="px-4 py-2 text-right">{prev ? <Change latest={p.value} previous={prev.value} unit={series.unit} /> : null}</td>
                        <td className="px-4 py-2 text-sm text-3">
                          {p.note}
                          {p.sourceUrl ? (
                            <a href={p.sourceUrl} target="_blank" rel="noopener" className="ml-1 underline">
                              source
                            </a>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          {stats?.n ? (
            <div className="surface p-5 text-[15px]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-3">Range on record</p>
              <dl className="space-y-1.5">
                <div className="flex justify-between"><dt className="text-2">High</dt><dd className="tabular">{fmt(stats.max)}</dd></div>
                <div className="flex justify-between"><dt className="text-2">Low</dt><dd className="tabular">{fmt(stats.min)}</dd></div>
                <div className="flex justify-between"><dt className="text-2">Average</dt><dd className="tabular">{fmt(Number(stats.avg))}</dd></div>
                <div className="flex justify-between"><dt className="text-2">Readings</dt><dd className="tabular">{stats.n}</dd></div>
                <div className="flex justify-between"><dt className="text-2">Since</dt><dd>{formatDate(stats.first)}</dd></div>
              </dl>
            </div>
          ) : null}
          <div className="surface p-5 text-[15px]">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-3">Source</p>
            {series.sourceUrl ? (
              <a href={series.sourceUrl} target="_blank" rel="noopener" className="text-brand-700 hover:underline dark:text-brand-300">
                {series.sourceName}
              </a>
            ) : (
              <p>{series.sourceName}</p>
            )}
            <p className="mt-2 text-sm text-3">
              JSON: <Link href={`/api/data/${slug}`} className="underline">/api/data/{slug}</Link>
            </p>
          </div>
          {tools.length ? (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">Uses this number</p>
              <div className="space-y-3">
                {tools.map((t) => (
                  <ToolCard key={t.slug} tool={t} />
                ))}
              </div>
            </div>
          ) : null}
          {entities.length ? (
            <div className="flex flex-wrap gap-2 text-sm">
              {entities.map((e) => (
                <Link key={e.id} href={`/e/${e.slug}`} className="border border-line px-2.5 py-1 text-2 hover:bg-surface-2 hover:text-[var(--text)]">
                  {e.name}
                </Link>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
