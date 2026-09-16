import Link from "next/link";
import { Alert, Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { todayCities } from "@/lib/today";
import { describeMag, fetchQuakes } from "@/lib/today/quakes";

export const revalidate = 600;

const when = (d: Date) => formatDate(d, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

export async function generateMetadata() {
  const cities = await todayCities();
  const quakes = await fetchQuakes(cities, { days: 30, minMag: 2.5 });
  const latest = quakes?.[0];
  const dayAgo = Date.now() - 86_400_000;
  const todayCount = quakes?.filter((q) => q.at.getTime() > dayAgo).length ?? 0;
  return buildMetadata({
    title: latest ? `Earthquake Today in Pakistan: ${todayCount ? `${todayCount} in the Last 24 Hours` : "Latest Tremors"}, Magnitude ${latest.mag.toFixed(1)} ${latest.place.replace(/^.*of /, "near ")}` : "Earthquake Today in Pakistan: Latest Tremors and Magnitudes",
    description: "Was there an earthquake in Pakistan today? Every tremor of magnitude 2.5 and above in and around Pakistan in the last 30 days from the USGS, with magnitude, depth, time in PKT and distance from the nearest city. Updated every 10 minutes.",
    path: "/earthquake-today",
    kicker: "Earthquake",
  });
}

export default async function EarthquakePage() {
  const cities = await todayCities();
  const quakes = await fetchQuakes(cities, { days: 30, minMag: 2.5 });
  const dayAgo = Date.now() - 86_400_000;
  const today = quakes?.filter((q) => q.at.getTime() > dayAgo) ?? [];
  const strong = quakes?.filter((q) => q.mag >= 4.5) ?? [];
  const latest = quakes?.[0];
  const crumbs = [
    { name: "Today", path: "/today" },
    { name: "Earthquake today", path: "/earthquake-today" },
  ];
  const faqs = [
    { question: "Was there an earthquake in Pakistan today?", answer: today.length ? `Yes: ${today.length} tremor${today.length === 1 ? "" : "s"} of magnitude 2.5 or more in the last 24 hours in and around Pakistan, the largest magnitude ${Math.max(...today.map((q) => q.mag)).toFixed(1)} ${[...today].sort((a, b) => b.mag - a.mag)[0].place}.` : `No tremor of magnitude 2.5 or more has been recorded in or around Pakistan in the last 24 hours${latest ? `; the most recent was magnitude ${latest.mag.toFixed(1)} ${latest.place} on ${when(latest.at)} PKT` : ""}.` },
    { question: "Why do earthquakes in Afghanistan shake Islamabad and Lahore?", answer: "Most tremors felt in Punjab and Khyber Pakhtunkhwa start in the Hindu Kush, 150 to 250 km deep under north-east Afghanistan. Deep quakes lose less energy over distance, so a magnitude 6 there sways buildings across northern Pakistan without much damage near the epicentre." },
    { question: "Where does this data come from?", answer: "The United States Geological Survey's public earthquake catalogue, which records events worldwide within minutes. Pakistan's own reports come from the Pakistan Meteorological Department's seismic centre and can differ slightly in magnitude and location." },
    { question: "What should I do during an earthquake?", answer: "Drop, cover and hold on: get under a sturdy table, away from windows and shelves, and stay there until the shaking stops. Do not run outside during the shaking; stairs and doorways are where people get hurt. Afterwards, check for gas smells before lighting anything." },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })} title="Earthquake today in Pakistan" description="Every tremor of magnitude 2.5 and above in and around Pakistan, newest first, with the distance from the nearest major city. Times in Pakistan Standard Time." />
      {!quakes ? (
        <Alert tone="warning" title="Feed unavailable">The USGS feed did not answer. Try again in a few minutes.</Alert>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="border-y-2 border-[var(--rule)] py-5">
              <p className="eyebrow">Last 24 hours</p>
              <p className="mt-1 font-display text-3xl">{today.length ? `${today.length} tremor${today.length === 1 ? "" : "s"}` : "No tremors of note"}</p>
              {latest ? (
                <p className="mt-2 text-[15px] text-2">
                  Most recent: magnitude {latest.mag.toFixed(1)} ({describeMag(latest.mag).toLowerCase()}), {latest.place}, {when(latest.at)} PKT, {latest.depthKm} km deep{latest.nearest ? `, ${latest.nearest.km} km from ${latest.nearest.city}` : ""}.
                </p>
              ) : null}
            </div>
            <SectionHeader title="Last 30 days" className="mt-8" description={`${quakes.length} events of magnitude 2.5 or more in the region; ${strong.length} of magnitude 4.5 or more.`} />
            <div className="overflow-x-auto">
              <table className="w-full text-[14.5px] tabular">
                <thead>
                  <tr className="border-b-2 border-[var(--rule)] text-left text-[12px] uppercase tracking-[0.08em] text-3">
                    <th className="py-2 pr-3 font-semibold">Time (PKT)</th>
                    <th className="py-2 pr-3 font-semibold">Magnitude</th>
                    <th className="py-2 pr-3 font-semibold">Where</th>
                    <th className="py-2 pr-3 font-semibold">Depth</th>
                    <th className="py-2 font-semibold">Nearest city</th>
                  </tr>
                </thead>
                <tbody>
                  {quakes.slice(0, 60).map((q) => (
                    <tr key={q.id} className={`border-b border-line ${q.mag >= 5 ? "font-semibold" : ""}`}>
                      <td className="whitespace-nowrap py-2 pr-3">{when(q.at)}</td>
                      <td className="py-2 pr-3">
                        <a href={q.url} target="_blank" rel="noopener" className="underline-offset-4 hover:underline">
                          {q.mag.toFixed(1)}
                        </a>{" "}
                        <span className="text-[12px] text-3">{describeMag(q.mag)}</span>
                      </td>
                      <td className="py-2 pr-3">{q.place}</td>
                      <td className="py-2 pr-3">{q.depthKm} km</td>
                      <td className="py-2">{q.nearest ? `${q.nearest.city}, ${q.nearest.km} km` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SectionHeader title="Questions" className="mt-10" />
            <div className="divide-y divide-[var(--border)] border-y border-line">
              {faqs.map((f) => (
                <details key={f.question} className="py-3">
                  <summary className="cursor-pointer list-none font-semibold">{f.question}</summary>
                  <p className="mt-2 text-[15px] text-2">{f.answer}</p>
                </details>
              ))}
            </div>
            <p className="mt-6 text-[13px] text-3">
              Data: <a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener" className="underline underline-offset-4">USGS Earthquake Hazards Program</a> (public domain), refreshed every 10 minutes. Pakistan Meteorological Department reports: <a href="https://seismic.pmd.gov.pk/" target="_blank" rel="noopener" className="underline underline-offset-4">seismic.pmd.gov.pk</a>.
            </p>
          </div>
          <aside className="space-y-8">
            <div>
              <p className="eyebrow">Also today</p>
              <ul className="mt-2 space-y-1 text-[15px]">
                <li>
                  <Link href="/weather" className="underline-offset-4 hover:underline">
                    Weather in your city
                  </Link>
                </li>
                <li>
                  <Link href="/prayer-times" className="underline-offset-4 hover:underline">
                    Prayer times
                  </Link>
                </li>
                <li>
                  <Link href="/news/pakistan" className="underline-offset-4 hover:underline">
                    Pakistan news today
                  </Link>
                </li>
                <li>
                  <Link href="/today" className="underline-offset-4 hover:underline">
                    Today in Pakistan
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
