import Link from "next/link";
import { Change } from "@/components/data/change";
import { WeatherIcon } from "@/components/today/weather-icon";
import { JsonLd, SectionHeader } from "@/components/ui";
import { listSeriesWithLatest } from "@/db/queries/data";
import { formatDate, formatReading } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { nowInPakistan, todayCities } from "@/lib/today";
import { pakistanHijri, readHijriOffset } from "@/lib/today/hijri";
import { groupMatches, readMatches } from "@/lib/match-today";
import { prayerTimes } from "@/lib/today/prayer";
import { h12 } from "@/lib/today/sun";
import { describeSymbol, fetchForecast } from "@/lib/today/weather";

export const revalidate = 1800;
export const metadata = buildMetadata({
  title: "Today in Pakistan: Prices, Weather, Prayer Times",
  description: "The numbers Pakistanis check every day on one page: petrol and gold today, dollar, riyal and dirham rates, weather and prayer times in your city, the Islamic date.",
  path: "/today",
  kicker: "Today",
});

const PRICE_SLUGS = ["petrol-price", "diesel-price", "gold-24k-tola", "gold-22k-tola", "silver-tola", "usd-pkr", "sar-pkr", "aed-pkr", "gbp-pkr", "eur-pkr", "kse-100", "sbp-policy-rate"];

export default async function TodayHub() {
  const [series, cities, offset, matches] = await Promise.all([listSeriesWithLatest(), todayCities(), readHijriOffset(), readMatches()]);
  const g = groupMatches(matches);
  const match = g.live[0] ?? g.today[0] ?? g.upcoming[0];
  const t = nowInPakistan();
  const hijri = pakistanHijri(t.date, offset.days);
  const big = cities.slice(0, 8);
  const weather = await Promise.all(big.map(async (c) => ({ ...c, f: await fetchForecast(c.lat, c.lng) })));
  const prices = PRICE_SLUGS.map((slug) => series.find((s) => s.slug === slug)).filter((s): s is NonNullable<typeof s> => !!s?.latest);
  const crumbs = [{ name: "Today", path: "/today" }];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <SectionHeader as="h1" eyebrow={`${formatDate(t.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${hijri.day} ${hijri.monthName} ${hijri.year} AH`} title="Today in Pakistan" description="The numbers people check every morning, on one page, each linked to its full history." />

      <SectionHeader title="Prices and rates" href="/data" hrefLabel="All data" />
      <div className="grid grid-cols-2 gap-px border border-line bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-4">
        {prices.map((s) => {
          return (
            <Link key={s.slug} href={`/data/${s.slug}`} className="bg-[var(--bg)] px-4 py-3 hover:bg-surface-2">
              <p className="text-[13px] text-2">{s.name.replace(/ in Pakistan.*$/i, "").replace(/ today$/i, "")}</p>
              <p className="mt-0.5 font-display text-2xl tabular">{formatReading(s.latest!.value, s.unit)}</p>
              <p className="text-[12.5px] text-3">
                <Change latest={s.latest!.value} previous={s.previous?.value ?? null} unit={s.unit} /> · {formatDate(s.latest!.date, { day: "numeric", month: "short" })}
              </p>
            </Link>
          );
        })}
      </div>

      <SectionHeader title="Weather now" href="/weather" hrefLabel="All cities" className="mt-12" />
      <div className="grid grid-cols-2 gap-px border border-line bg-[var(--border)] sm:grid-cols-4">
        {weather.map((c) => (
          <Link key={c.slug} href={`/weather/${c.slug}`} className="flex items-center gap-3 bg-[var(--bg)] px-4 py-3 hover:bg-surface-2">
            {c.f ? <WeatherIcon code={c.f.now.symbol} className="size-6 shrink-0 stroke-[1.5]" aria-label={describeSymbol(c.f.now.symbol)} /> : null}
            <div className="min-w-0">
              <p className="font-semibold">{c.name}</p>
              <p className="truncate text-[12.5px] text-3">{c.f ? describeSymbol(c.f.now.symbol) : "Unavailable"}</p>
            </div>
            <p className="ml-auto font-display text-2xl tabular">{c.f ? `${Math.round(c.f.now.temp)}°` : "-"}</p>
          </Link>
        ))}
      </div>

      <SectionHeader title="Prayer times" href="/prayer-times" hrefLabel="All cities" className="mt-12" />
      <div className="overflow-x-auto">
        <table className="w-full text-[14.5px] tabular">
          <thead>
            <tr className="border-b-2 border-[var(--rule)] text-left text-[12px] uppercase tracking-[0.08em] text-3">
              <th className="py-2 pr-3 font-semibold">City</th>
              <th className="py-2 pr-3 font-semibold">Fajr</th>
              <th className="py-2 pr-3 font-semibold">Dhuhr</th>
              <th className="py-2 pr-3 font-semibold">Asr</th>
              <th className="py-2 pr-3 font-semibold">Maghrib</th>
              <th className="py-2 pr-3 font-semibold">Isha</th>
            </tr>
          </thead>
          <tbody>
            {big.map((c) => {
              const p = prayerTimes(t.y, t.m, t.d, c.lat, c.lng);
              return (
                <tr key={c.slug} className="border-b border-line">
                  <td className="py-2 pr-3 font-semibold">
                    <Link href={`/prayer-times/${c.slug}`} className="underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{h12(p.fajr)}</td>
                  <td className="py-2 pr-3">{h12(p.dhuhr)}</td>
                  <td className="py-2 pr-3">{h12(p.asr)}</td>
                  <td className="py-2 pr-3">{h12(p.maghrib)}</td>
                  <td className="py-2 pr-3">{h12(p.isha)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-3">
        <div>
          <p className="eyebrow">Islamic date</p>
          <p className="mt-1 font-display text-2xl">
            <Link href="/islamic-date" className="headline-link">
              {hijri.day} {hijri.monthName} {hijri.year} AH
            </Link>
          </p>
        </div>
        <div>
          <p className="eyebrow">Bills</p>
          <p className="mt-1 text-[15px]">
            <Link href="/electricity" className="underline-offset-4 hover:underline">
              Electricity bill check
            </Link>
            {" · "}
            <Link href="/guides/utilities/sui-gas-bill-check-online-sngpl-and-ssgc-duplicate-bill-by-consumer-number-2026" className="underline-offset-4 hover:underline">
              Gas bill
            </Link>
          </p>
        </div>
        <div>
          <p className="eyebrow">Cricket today</p>
          <p className="mt-1 text-[15px]">
            <Link href="/cricket-today" className="underline-offset-4 hover:underline">
              {match ? `${match.title}, ${formatDate(match.startAt, { weekday: "short", hour: "numeric", minute: "2-digit", hour12: true })}${match.status === "live" && match.score ? ` (live: ${match.score})` : ""}` : "Fixtures and scores"}
            </Link>
            {" · "}
            <Link href="/news/sports" className="underline-offset-4 hover:underline">
              All sport
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
