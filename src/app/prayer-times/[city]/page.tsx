import Link from "next/link";
import { notFound } from "next/navigation";
import { NextPrayer } from "@/components/today/next-prayer";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { addDays, nowInPakistan, todayCities, todayCity } from "@/lib/today";
import { pakistanHijri, readHijriOffset } from "@/lib/today/hijri";
import { PRAYER_LABELS, prayerTimes } from "@/lib/today/prayer";
import { h12 } from "@/lib/today/sun";

export const revalidate = 1800;
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props) {
  const { city } = await params;
  const loc = await todayCity(city);
  if (!loc) return {};
  const t = nowInPakistan();
  const p = prayerTimes(t.y, t.m, t.d, loc.lat, loc.lng);
  return buildMetadata({
    title: `${loc.name} Prayer Times Today: Fajr ${h12(p.fajr)}, Maghrib ${h12(p.maghrib)}`,
    description: `Namaz timings in ${loc.name} for ${formatDate(t.date, { day: "numeric", month: "long", year: "numeric" })}: Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha, with sehri and iftar times and the week ahead. Karachi method, Hanafi Asr.`,
    path: `/prayer-times/${loc.slug}`,
    kicker: "Prayer times",
  });
}

export default async function PrayerTimesPage({ params }: Props) {
  const { city } = await params;
  const loc = await todayCity(city);
  if (!loc) notFound();
  const [cities, offset] = await Promise.all([todayCities(), readHijriOffset()]);
  const t = nowInPakistan();
  const hijri = pakistanHijri(t.date, offset.days);
  const today = prayerTimes(t.y, t.m, t.d, loc.lat, loc.lng);
  const todayShafi = prayerTimes(t.y, t.m, t.d, loc.lat, loc.lng, { asr: "shafi" });
  const tomorrow = addDays(t.y, t.m, t.d, 1);
  const tomorrowTimes = prayerTimes(tomorrow.y, tomorrow.m, tomorrow.d, loc.lat, loc.lng);
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(t.y, t.m, t.d, i);
    return { day, times: prayerTimes(day.y, day.m, day.d, loc.lat, loc.lng), date: new Date(Date.UTC(day.y, day.m - 1, day.d, 7)) };
  });
  const dateLong = formatDate(t.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const faqs = [
    { question: `What time is Fajr in ${loc.name} today?`, answer: `Fajr in ${loc.name} on ${dateLong} is at ${h12(today.fajr)}, and sunrise is at ${h12(today.sunrise)}. Sehri ends at Fajr.` },
    { question: `What time is Maghrib in ${loc.name} today?`, answer: `Maghrib (iftar) in ${loc.name} is at ${h12(today.maghrib)} today, one minute after sunset at ${h12(today.maghrib - 1 / 60)}.` },
    { question: "Which calculation method is used?", answer: "The University of Islamic Sciences, Karachi convention that Pakistani timetables follow: Fajr and Isha at 18 degrees below the horizon, Asr by the Hanafi rule (shadow twice the object's length), Dhuhr and Maghrib with a one-minute precaution. The Shafi Asr is shown as well. Mosques may add a few minutes of their own." },
    { question: "Is this the same as my local mosque's timetable?", answer: "Usually within a minute or two. Timetables printed by a mosque or a city's ulema often round up and add precautionary minutes, so follow your mosque's adhan for the jamaat time and use these times for sehri, iftar and travel." },
  ];
  const crumbs = [
    { name: "Today", path: "/today" },
    { name: "Prayer times", path: "/prayer-times" },
    { name: loc.name, path: `/prayer-times/${loc.slug}` },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={`${dateLong} · ${hijri.day} ${hijri.monthName} ${hijri.year} AH`} title={`Prayer times in ${loc.name} today`} description={`Namaz timings for ${loc.name}: Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha, with sehri and iftar. Pakistan Standard Time.`} />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <NextPrayer today={today} tomorrowFajr={tomorrowTimes.fajr} />
          <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-6">
            {PRAYER_LABELS.map((p) => (
              <div key={p.key} className="bg-[var(--bg)] px-4 py-4">
                <p className="eyebrow">{p.label}</p>
                <p className="mt-1 whitespace-nowrap font-display text-[22px] tabular">{h12(today[p.key])}</p>
                <p className="text-[13px] text-3" lang="ur" dir="rtl">
                  {p.urdu}
                </p>
              </div>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[15px] sm:grid-cols-4">
            <div>
              <dt className="text-3">Sehri ends</dt>
              <dd className="font-semibold tabular">{h12(today.fajr)}</dd>
            </div>
            <div>
              <dt className="text-3">Iftar</dt>
              <dd className="font-semibold tabular">{h12(today.maghrib)}</dd>
            </div>
            <div>
              <dt className="text-3">Asr (Shafi)</dt>
              <dd className="font-semibold tabular">{h12(todayShafi.asr)}</dd>
            </div>
            <div>
              <dt className="text-3">Islamic midnight</dt>
              <dd className="font-semibold tabular">{h12(today.midnight)}</dd>
            </div>
          </dl>

          <SectionHeader title="This week" className="mt-10" description={`${loc.name}, ${formatDate(week[0].date, { day: "numeric", month: "short" })} to ${formatDate(week[6].date, { day: "numeric", month: "short" })}`} />
          <div className="overflow-x-auto">
            <table className="w-full text-[14.5px] tabular">
              <thead>
                <tr className="border-b-2 border-[var(--rule)] text-left text-[12px] uppercase tracking-[0.08em] text-3">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  {PRAYER_LABELS.map((p) => (
                    <th key={p.key} className="py-2 pr-3 font-semibold">
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {week.map((w, i) => (
                  <tr key={w.day.d} className={i === 0 ? "border-b border-line bg-surface-2 font-semibold" : "border-b border-line"}>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatDate(w.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                    {PRAYER_LABELS.map((p) => (
                      <td key={p.key} className="py-2 pr-3 whitespace-nowrap">
                        {h12(w.times[p.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionHeader title="How these times are worked out" className="mt-10" />
          <div className="prose-searchable">
            <p>
              Times are calculated for {loc.name} ({loc.lat.toFixed(2)}° N, {loc.lng.toFixed(2)}° E) with the University of Islamic Sciences, Karachi convention: Fajr when the sun is 18° below the eastern horizon, Isha at 18° below the western horizon, Asr by the Hanafi rule (the Shafi time is shown separately), and a one-minute precaution on Dhuhr and Maghrib. This is the convention Pakistan&apos;s printed timetables use, so the figures normally agree with your mosque to within a minute or two; the mosque&apos;s adhan decides jamaat.
            </p>
            <p>
              Sehri ends at Fajr and iftar is at Maghrib. Sunrise marks the end of Fajr time; nothing is offered between sunrise and about twenty minutes after it, or in the minutes around solar noon and sunset.
            </p>
          </div>

          <SectionHeader title="Questions" className="mt-10" />
          <div className="divide-y divide-[var(--border)] border-y border-line">
            {faqs.map((f) => (
              <details key={f.question} className="group py-3">
                <summary className="cursor-pointer list-none font-semibold">{f.question}</summary>
                <p className="mt-2 text-[15px] text-2">{f.answer}</p>
              </details>
            ))}
          </div>
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
                    <Link href={`/prayer-times/${c.slug}`} className="underline-offset-4 hover:underline">
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
                <Link href={`/weather/${loc.slug}`} className="underline-offset-4 hover:underline">
                  {loc.name} weather today
                </Link>
              </li>
              <li>
                <Link href="/islamic-date" className="underline-offset-4 hover:underline">
                  Islamic date today in Pakistan
                </Link>
              </li>
              <li>
                <Link href="/data/gold-24k-tola" className="underline-offset-4 hover:underline">
                  Gold rate today
                </Link>
              </li>
              <li>
                <Link href="/data/petrol-price" className="underline-offset-4 hover:underline">
                  Petrol price today
                </Link>
              </li>
              <li>
                <Link href="/tools/finance/zakat-calculator" className="underline-offset-4 hover:underline">
                  Zakat calculator
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
