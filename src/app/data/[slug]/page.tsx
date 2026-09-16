import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/ads";
import { ArticleCard, ToolCard } from "@/components/cards";
import { CiteThis, KeyFacts } from "@/components/cite";
import { Change } from "@/components/data/change";
import { GoldExtras } from "@/components/data/gold-extras";
import { RangeChart } from "@/components/data/range-chart";
import { ChartPlaceholder, Conversions, Explainer, RelatedSeries } from "@/components/data/series-extras";
import { SaveButton } from "@/components/saved/save-button";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { DATA_SERIES_CONTENT } from "@/content/data-series";
import { articlesForEntitySlugs } from "@/db/queries/content";
import { getSeries, listSeriesWithLatest, seriesStats } from "@/db/queries/data";
import { getEntitiesBySlugs } from "@/db/queries/entities";
import { formatDate, number } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";
import { getTool } from "@/tools/registry";

export const revalidate = 600;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ slug: string }> };

/** Which calculators and topics each series feeds. Extend as tools are added. */
const LINKS: Record<string, { tools?: string[]; entities?: string[] }> = {
  "petrol-price": { tools: ["fuel-cost-calculator"], entities: ["petrol", "ogra"] },
  "diesel-price": { tools: ["fuel-cost-calculator"], entities: ["petrol", "ogra"] },
  "usd-pkr": { tools: ["currency-converter", "pta-mobile-tax-calculator"], entities: ["usd-pkr", "sbp"] },
  "gold-24k-tola": { tools: ["zakat-calculator"], entities: ["gold"] },
  "sbp-policy-rate": { tools: ["car-loan-calculator", "home-loan-calculator"], entities: ["sbp"] },
  "kibor-1y": { tools: ["car-loan-calculator", "home-loan-calculator"], entities: ["sbp", "meezan-bank", "hbl"] },
  "cpi-yoy": { tools: ["salary-breakdown-calculator"], entities: ["sbp"] },
  "gold-22k-tola": { tools: ["zakat-calculator"], entities: ["gold"] },
  "silver-tola": { tools: ["zakat-calculator"], entities: ["gold"] },
  "eur-pkr": { tools: ["currency-converter"], entities: ["usd-pkr", "sbp"] },
  "gbp-pkr": { tools: ["currency-converter"], entities: ["usd-pkr", "sbp"] },
  "aed-pkr": { tools: ["currency-converter"], entities: ["usd-pkr", "sbp"] },
  "sar-pkr": { tools: ["currency-converter"], entities: ["usd-pkr", "sbp"] },
  "kse-100": { tools: [], entities: ["psx", "sbp"] },
  "btc-usd": { tools: ["currency-converter"], entities: ["usd-pkr"] },
  "eth-usd": { tools: ["currency-converter"], entities: ["usd-pkr"] },
  "solar-panel-per-watt": { tools: ["solar-payback-calculator"], entities: ["nepra"] },
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await getSeries(slug, 1);
  if (!data) return {};
  const latest = data.points[data.points.length - 1];
  const value = latest ? (data.series.unit === "%" ? `${number(latest.value, 2)}%` : `${number(latest.value, Number.isInteger(latest.value) ? 0 : 2)} ${data.series.unit}`) : "";
  return buildMetadata({
    title: `${/today/i.test(data.series.name) ? data.series.name : `${data.series.name} today`}${value ? `: ${value}` : ""}`,
    description: `${data.series.name} in Pakistan with history, source (${data.series.sourceName ?? "official"}) and the date of every change. Updated ${data.series.frequency}.`,
    path: `/data/${slug}`,
    markdownPath: `/api/md/data/${slug}`,
  });
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const data = await getSeries(slug, 2000);
  if (!data) notFound();
  const { series, points } = data;
  const content = DATA_SERIES_CONTENT[slug];
  const [stats, entities, all, stories] = await Promise.all([seriesStats(series.id), getEntitiesBySlugs(LINKS[slug]?.entities ?? []), listSeriesWithLatest(), articlesForEntitySlugs(LINKS[slug]?.entities ?? [], 4)]);
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const tools = (LINKS[slug]?.tools ?? []).map(getTool).filter((t): t is NonNullable<typeof t> => !!t);
  const fmt = (v: number) => (series.unit === "%" ? `${number(v, 2)}%` : number(v, Number.isInteger(v) ? 0 : 2));
  const crumbs = [{ name: "Data", path: "/data" }, { name: series.name, path: `/data/${slug}` }];
  const recent = [...points].reverse().slice(0, 30);
  const usdPkr = all.find((s) => s.slug === "usd-pkr")?.latest?.value ?? null;
  const related = (content?.related ?? []).map((r) => all.find((s) => s.slug === r)).filter((s): s is NonNullable<typeof s> => !!s);

  // Change over a period: against the reading closest before the cutoff.
  const changeOver = (days: number) => {
    if (!latest) return null;
    const target = new Date(new Date(latest.date).getTime() - days * 86_400_000).toISOString().slice(0, 10);
    const base = [...points].reverse().find((p) => p.date <= target);
    return base && base.date !== latest.date ? base : null;
  };
  const periods = [
    { label: "1 week", base: changeOver(7) },
    { label: "1 month", base: changeOver(30) },
    { label: "1 year", base: changeOver(365) },
  ].filter((p): p is { label: string; base: NonNullable<ReturnType<typeof changeOver>> } => !!p.base);

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
            dateModified: latest?.date,
            temporalCoverage: stats?.first && stats?.last ? `${stats.first}/${stats.last}` : undefined,
            distribution: [
              { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE.url}/api/data/${slug}` },
              { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE.url}/api/data/${slug}?format=csv` },
            ],
          },
        ]}
      />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <AdSlot name="leaderboard" className="my-4" />
      <SectionHeader as="h1" title={series.name} description={series.description ?? `Recorded ${series.frequency} from ${series.sourceName ?? "the official source"}.`} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-8">
          {/* The number */}
          <section className="border-y-2 border-[var(--rule)] py-5">
            <p className="text-[13px] text-3">
              {latest ? (
                <>
                  As of <time dateTime={latest.date}>{formatDate(latest.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</time> · {series.sourceName ?? "official source"} · updated {series.frequency}
                </>
              ) : (
                "No reading yet"
              )}
            </p>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-5xl tabular tracking-tight sm:text-6xl">{latest ? fmt(latest.value) : "-"}</span>
              {latest && series.unit !== "%" ? <span className="text-lg text-3">{series.unit}</span> : null}
              {latest && previous ? (
                <span className="text-[15px]">
                  <Change latest={latest.value} previous={previous.value} unit={series.unit} /> <span className="text-3">since {formatDate(previous.date)}</span>
                </span>
              ) : null}
            </p>
            {periods.length && latest ? (
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[14px]">
                {periods.map((p) => (
                  <div key={p.label} className="flex items-baseline gap-2">
                    <dt className="text-3">{p.label}</dt>
                    <dd className="tabular">
                      <Change latest={latest.value} previous={p.base.value} unit={series.unit} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>

          {/* The chart */}
          {points.length >= 2 ? <RangeChart points={points.map((p) => ({ date: p.date, value: p.value }))} unit={series.unit} /> : (
            <section>
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-3">History</h2>
              <ChartPlaceholder since={latest?.date ?? stats?.first ?? ""} frequency={series.frequency} />
            </section>
          )}

          {content?.conversions && latest ? <Conversions kind={content.conversions} code={content.code} value={latest.value} usdPkr={usdPkr} date={latest.date} /> : null}
          {(slug === "gold-24k-tola" || slug === "gold-22k-tola") && latest ? <GoldExtras slug={slug} latestPerTola={latest.value} date={latest.date} /> : null}

          {latest ? (
            <KeyFacts
              asOf={latest.date}
              facts={[
                { label: series.name.replace(/ today$/i, ""), value: `${fmt(latest.value)} ${series.unit}` },
                ...(previous ? [{ label: `Change since ${formatDate(previous.date)}`, value: `${latest.value - previous.value >= 0 ? "+" : ""}${fmt(latest.value - previous.value)} ${series.unit}` }] : []),
                ...(stats && stats.n > 1 ? [{ label: `Lowest on record (${formatDate(stats.first)} to ${formatDate(stats.last)})`, value: `${fmt(stats.min)} ${series.unit}` }, { label: "Highest on record", value: `${fmt(stats.max)} ${series.unit}` }] : []),
                { label: "Source", value: series.sourceName ?? "Official" },
                { label: "Updated", value: series.frequency },
              ]}
            />
          ) : null}

          {content ? <Explainer name={series.name} content={content} /> : null}

          {stories.length ? (
            <section className="border-t border-line pt-4">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-3">The news behind the number</h2>
              <div className="divide-y divide-[var(--border)]">
                {stories.map((a, i) => (
                  <ArticleCard key={a.id} article={a} variant="compact" index={i + 1} className="py-3" />
                ))}
              </div>
            </section>
          ) : null}

          <section className="border-t border-line pt-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-3">Every reading</h2>
              <p className="text-[13px] text-3">
                <Link href={`/api/data/${slug}?format=csv`} className="underline underline-offset-4">
                  CSV
                </Link>{" "}
                ·{" "}
                <Link href={`/api/data/${slug}`} className="underline underline-offset-4">
                  JSON
                </Link>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[15px]">
                <thead className="text-left text-xs uppercase tracking-wider text-3">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 text-right font-medium">Value</th>
                    <th className="py-2 pr-4 text-right font-medium">Change</th>
                    <th className="py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {recent.map((p, i) => {
                    const prev = recent[i + 1];
                    return (
                      <tr key={p.id}>
                        <td className="whitespace-nowrap py-2 pr-4">{formatDate(p.date)}</td>
                        <td className="py-2 pr-4 text-right tabular font-medium">{fmt(p.value)}</td>
                        <td className="py-2 pr-4 text-right">{prev ? <Change latest={p.value} previous={prev.value} unit={series.unit} /> : <span className="text-sm text-3">first</span>}</td>
                        <td className="py-2 text-sm text-3">
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
            {points.length > recent.length ? <p className="mt-2 text-[13px] text-3">Showing the last {recent.length} of {points.length} readings; the CSV has all of them.</p> : null}
          </section>

          <SaveButton target={{ targetType: "data_series", targetId: series.id, title: series.name, url: `/data/${slug}` }} label="Save this series" />
          <CiteThis title={series.name} path={`/data/${slug}`} date={latest?.date} markdownPath={`/api/md/data/${slug}`} />
        </div>

        <aside className="space-y-8 self-start lg:sticky lg:top-24">
          <RelatedSeries items={related} />
          {stats?.n && stats.n > 1 ? (
            <div className="text-[15px]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-3">On record</p>
              <dl className="divide-y divide-[var(--border)] border-y border-line">
                <div className="flex justify-between py-1.5"><dt className="text-2">High</dt><dd className="tabular">{fmt(stats.max)}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-2">Low</dt><dd className="tabular">{fmt(stats.min)}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-2">Average</dt><dd className="tabular">{fmt(Number(stats.avg))}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-2">Readings</dt><dd className="tabular">{stats.n}</dd></div>
                <div className="flex justify-between py-1.5"><dt className="text-2">Since</dt><dd>{formatDate(stats.first)}</dd></div>
              </dl>
            </div>
          ) : null}
          <div className="text-[15px]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-3">Source</p>
            {series.sourceUrl ? (
              <a href={series.sourceUrl} target="_blank" rel="noopener" className="underline underline-offset-4">
                {series.sourceName}
              </a>
            ) : (
              <p>{series.sourceName}</p>
            )}
            <p className="mt-2 text-[13px] text-3">
              Machine-readable: <Link href={`/api/data/${slug}`} className="underline">JSON</Link> · <Link href={`/api/data/${slug}?format=csv`} className="underline">CSV</Link> · <Link href={`/api/md/data/${slug}`} className="underline">Markdown</Link>
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
