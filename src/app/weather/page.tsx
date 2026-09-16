import Link from "next/link";
import { WeatherIcon } from "@/components/today/weather-icon";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { nowInPakistan, todayCities } from "@/lib/today";
import { describeSymbol, fetchForecast } from "@/lib/today/weather";

export const revalidate = 1800;
export const metadata = buildMetadata({
  title: "Weather Today in Pakistan: Karachi, Lahore, Islamabad and 20 Cities",
  description: "Current temperature, conditions and today's high and low for every major city in Pakistan, updated every 30 minutes, with hourly and 7-day forecasts on each city page.",
  path: "/weather",
  kicker: "Weather",
});

export default async function WeatherHub() {
  const cities = await todayCities();
  const t = nowInPakistan();
  const rows = await Promise.all(cities.map(async (c) => ({ ...c, f: await fetchForecast(c.lat, c.lng) })));
  const crumbs = [
    { name: "Today", path: "/today" },
    { name: "Weather", path: "/weather" },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={formatDate(t.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} title="Weather today in Pakistan" description="Right now in every major city. Open a city for the hourly and 7-day forecast, sunrise and sunset." />
      <div className="grid gap-px border border-line bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((r) => (
          <Link key={r.slug} href={`/weather/${r.slug}`} className="flex items-center gap-4 bg-[var(--bg)] px-4 py-4 hover:bg-surface-2">
            {r.f ? <WeatherIcon code={r.f.now.symbol} className="size-8 shrink-0 stroke-[1.5]" aria-label={describeSymbol(r.f.now.symbol)} /> : <span className="size-8 shrink-0" />}
            <div className="min-w-0">
              <p className="font-semibold">{r.name}</p>
              <p className="text-[13.5px] text-2">{r.f ? `${describeSymbol(r.f.now.symbol)} · ${r.f.days[0]?.max}° / ${r.f.days[0]?.min}°` : "Forecast unavailable"}</p>
            </div>
            <p className="ml-auto font-display text-3xl tabular">{r.f ? `${Math.round(r.f.now.temp)}°` : "-"}</p>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-[13px] text-3">
        Forecasts by{" "}
        <a href="https://www.met.no/en" rel="noopener" target="_blank" className="underline underline-offset-4">
          MET Norway
        </a>{" "}
        (CC BY 4.0), refreshed every 30 minutes.
      </p>
    </div>
  );
}
