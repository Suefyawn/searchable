import Link from "next/link";
import { notFound } from "next/navigation";
import { WeatherIcon } from "@/components/today/weather-icon";
import { Alert, Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { nowInPakistan, todayCities, todayCity } from "@/lib/today";
import { h12, sunTimes } from "@/lib/today/sun";
import { describeSymbol, fetchForecast } from "@/lib/today/weather";

export const revalidate = 1800;
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ city: string }> };

const hourLabel = new Intl.DateTimeFormat("en-PK", { timeZone: "Asia/Karachi", hour: "numeric", hour12: true });

export async function generateMetadata({ params }: Props) {
  const { city } = await params;
  const loc = await todayCity(city);
  if (!loc) return {};
  const f = await fetchForecast(loc.lat, loc.lng);
  const today = f?.days[0];
  const title = f && today ? `${loc.name} Weather Today: ${Math.round(f.now.temp)}°C, ${describeSymbol(f.now.symbol)}, Hourly and 7-Day Forecast` : `${loc.name} Weather Today and 7-Day Forecast`;
  return buildMetadata({
    title,
    description: `${loc.name} weather now${f && today ? `: ${Math.round(f.now.temp)}°C, high ${today.max}°, low ${today.min}°` : ""}. Hourly forecast for 24 hours, 7-day outlook, rain, humidity, wind, sunrise and sunset. Updated every 30 minutes.`,
    path: `/weather/${loc.slug}`,
    kicker: "Weather",
  });
}

export default async function WeatherPage({ params }: Props) {
  const { city } = await params;
  const loc = await todayCity(city);
  if (!loc) notFound();
  const [cities, f] = await Promise.all([todayCities(), fetchForecast(loc.lat, loc.lng)]);
  const t = nowInPakistan();
  const sun = sunTimes(t.y, t.m, t.d, loc.lat, loc.lng);
  const dateLong = formatDate(t.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const crumbs = [
    { name: "Today", path: "/today" },
    { name: "Weather", path: "/weather" },
    { name: loc.name, path: `/weather/${loc.slug}` },
  ];
  const today = f?.days[0];
  const faqs = f && today
    ? [
        { question: `What is the temperature in ${loc.name} right now?`, answer: `${Math.round(f.now.temp)}°C in ${loc.name}, feels like ${Math.round(f.now.feelsLike)}°C, with ${describeSymbol(f.now.symbol).toLowerCase()} and ${f.now.humidity}% humidity (MET Norway forecast, updated ${formatDate(f.updatedAt, { hour: "numeric", minute: "2-digit", hour12: true })}).` },
        { question: `Will it rain in ${loc.name} today?`, answer: today.rainMm >= 0.5 ? `Yes, the forecast has about ${today.rainMm} mm of rain in ${loc.name} today.` : `No rain of note is forecast for ${loc.name} today (${today.rainMm} mm).` },
        { question: `What time is sunset in ${loc.name} today?`, answer: `Sunset in ${loc.name} is at ${h12(sun.sunset)} today; sunrise was at ${h12(sun.sunrise)}.` },
      ]
    : [];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={dateLong} title={`${loc.name} weather today`} description={`Live conditions, the next 24 hours and a 7-day forecast for ${loc.name}, with sunrise and sunset.`} />

      {!f ? (
        <Alert tone="warning" title="Forecast unavailable right now">
          The forecast service did not answer. Sunrise in {loc.name} is at {h12(sun.sunrise)} and sunset at {h12(sun.sunset)}; try again in a few minutes for the temperature.
        </Alert>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-y-2 border-[var(--rule)] py-5">
              <div className="flex items-center gap-4">
                <WeatherIcon code={f.now.symbol} className="size-14 stroke-[1.4]" aria-hidden />
                <div>
                  <p className="font-display text-6xl leading-none tabular">{Math.round(f.now.temp)}°</p>
                  <p className="mt-1 text-[15px] text-2">{describeSymbol(f.now.symbol)}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-[14.5px] sm:grid-cols-3">
                <div>
                  <dt className="text-3">Feels like</dt>
                  <dd className="font-semibold tabular">{Math.round(f.now.feelsLike)}°C</dd>
                </div>
                <div>
                  <dt className="text-3">High / low</dt>
                  <dd className="font-semibold tabular">
                    {today?.max}° / {today?.min}°
                  </dd>
                </div>
                <div>
                  <dt className="text-3">Humidity</dt>
                  <dd className="font-semibold tabular">{f.now.humidity}%</dd>
                </div>
                <div>
                  <dt className="text-3">Wind</dt>
                  <dd className="font-semibold tabular">
                    {f.now.windKmh} km/h {f.now.windFrom}
                  </dd>
                </div>
                <div>
                  <dt className="text-3">Rain today</dt>
                  <dd className="font-semibold tabular">{today?.rainMm ?? 0} mm</dd>
                </div>
                <div>
                  <dt className="text-3">Sunrise / sunset</dt>
                  <dd className="font-semibold tabular">
                    {h12(sun.sunrise)} / {h12(sun.sunset)}
                  </dd>
                </div>
              </dl>
            </div>
            <p className="mt-2 text-[12.5px] text-3">
              Forecast by MET Norway, issued {formatDate(f.updatedAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })} PKT. Pressure {f.now.pressure} hPa, cloud cover {f.now.cloud}%.
            </p>

            <SectionHeader title="Next 24 hours" className="mt-10" />
            <div className="overflow-x-auto">
              <div className="flex min-w-max gap-px border border-line bg-[var(--border)]">
                {f.hours.map((h) => (
                  <div key={h.at.toISOString()} className="w-[68px] bg-[var(--bg)] px-2 py-3 text-center">
                    <p className="text-[12px] text-3">{hourLabel.format(h.at).replace(" ", "")}</p>
                    <WeatherIcon code={h.symbol} className="mx-auto my-1.5 size-5 stroke-[1.6]" aria-label={describeSymbol(h.symbol)} />
                    <p className="font-semibold tabular">{Math.round(h.temp)}°</p>
                    <p className="text-[11.5px] tabular text-3">{h.rainMm > 0 ? `${h.rainMm} mm` : " "}</p>
                  </div>
                ))}
              </div>
            </div>

            <SectionHeader title="7-day forecast" className="mt-10" />
            <div className="divide-y divide-[var(--border)] border-y border-line">
              {f.days.map((d, i) => (
                <div key={d.date} className="grid grid-cols-[72px_32px_1fr_auto] items-center gap-3 py-2.5 text-[15px] sm:grid-cols-[110px_32px_1fr_auto]">
                  <p className={i === 0 ? "font-semibold" : ""}>{i === 0 ? "Today" : d.weekday}</p>
                  <WeatherIcon code={d.symbol} className="size-5 stroke-[1.6]" aria-label={describeSymbol(d.symbol)} />
                  <p className="text-2">
                    {describeSymbol(d.symbol)}
                    {d.rainMm >= 0.5 ? `, ${d.rainMm} mm` : ""}
                  </p>
                  <p className="tabular">
                    <span className="font-semibold">{d.max}°</span> <span className="text-3">{d.min}°</span>
                  </p>
                </div>
              ))}
            </div>

            {faqs.length ? (
              <>
                <SectionHeader title="Questions" className="mt-10" />
                <div className="divide-y divide-[var(--border)] border-y border-line">
                  {faqs.map((q) => (
                    <details key={q.question} className="py-3">
                      <summary className="cursor-pointer list-none font-semibold">{q.question}</summary>
                      <p className="mt-2 text-[15px] text-2">{q.answer}</p>
                    </details>
                  ))}
                </div>
              </>
            ) : null}
            <p className="mt-6 text-[13px] text-3">
              Weather data from{" "}
              <a href="https://www.met.no/en" rel="noopener" target="_blank" className="underline underline-offset-4">
                MET Norway
              </a>{" "}
              (CC BY 4.0), refreshed every 30 minutes. Sunrise and sunset computed for {loc.lat.toFixed(2)}° N, {loc.lng.toFixed(2)}° E.
            </p>
          </div>

          <aside className="space-y-8">
            <div>
              <p className="eyebrow">Other cities</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[15px] lg:grid-cols-1">
                {cities
                  .filter((c) => c.slug !== loc.slug)
                  .slice(0, 19)
                  .map((c) => (
                    <li key={c.slug}>
                      <Link href={`/weather/${c.slug}`} className="underline-offset-4 hover:underline">
                        {c.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow">Also today</p>
              <ul className="mt-2 space-y-1 text-[15px]">
                <li>
                  <Link href={`/prayer-times/${loc.slug}`} className="underline-offset-4 hover:underline">
                    {loc.name} prayer times
                  </Link>
                </li>
                <li>
                  <Link href={`/cities/${loc.slug}`} className="underline-offset-4 hover:underline">
                    {loc.name} city page
                  </Link>
                </li>
                <li>
                  <Link href="/tools/utilities/ac-running-cost-calculator" className="underline-offset-4 hover:underline">
                    What your AC costs to run
                  </Link>
                </li>
                <li>
                  <Link href="/electricity" className="underline-offset-4 hover:underline">
                    Electricity bill check
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
