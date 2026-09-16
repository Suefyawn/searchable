import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { nowInPakistan, todayCities, todayCity } from "@/lib/today";
import { ramadanWindow, readHijriOffset } from "@/lib/today/hijri";
import { prayerTimes } from "@/lib/today/prayer";
import { h12 } from "@/lib/today/sun";

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props) {
  const { city } = await params;
  const loc = await todayCity(city);
  if (!loc) return {};
  const offset = await readHijriOffset();
  const w = ramadanWindow(new Date(), offset.days);
  const gy = w?.first.getFullYear() ?? new Date().getFullYear();
  return buildMetadata({
    title: `Ramadan Calendar ${gy} ${loc.name}: Sehri and Iftar Times, All 30 Days`,
    description: `Ramadan ${w?.year ?? ""} AH sehri and iftar timings for ${loc.name}, every day of the month, with Fajr and Maghrib, from the Karachi calculation method used by Pakistan's timetables. Expected dates until the moon is sighted.`,
    path: `/ramadan-calendar/${loc.slug}`,
    kicker: "Ramadan",
  });
}

export default async function RamadanCityPage({ params }: Props) {
  const { city } = await params;
  const loc = await todayCity(city);
  if (!loc) notFound();
  const [cities, offset] = await Promise.all([todayCities(), readHijriOffset()]);
  const t = nowInPakistan();
  const w = ramadanWindow(t.date, offset.days);
  if (!w) notFound();
  const gy = w.first.getFullYear();
  const rows = w.days.map(({ n, date }) => {
    const s = new Date(date.getTime() + 5 * 3_600_000);
    const p = prayerTimes(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate(), loc.lat, loc.lng);
    return { n, date, sehri: p.fajr, iftar: p.maghrib, today: s.toISOString().slice(0, 10) === t.iso };
  });
  const crumbs = [
    { name: "Today", path: "/today" },
    { name: "Ramadan calendar", path: "/ramadan-calendar" },
    { name: loc.name, path: `/ramadan-calendar/${loc.slug}` },
  ];
  const faqs = [
    { question: `When does Ramadan ${gy} start in Pakistan?`, answer: `The first fast of Ramadan ${w.year} AH is expected on ${formatDate(w.first, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, subject to the Ruet-e-Hilal Committee's moon sighting the evening before; if the moon is not sighted, everything moves a day later.` },
    { question: `What is the sehri time in ${loc.name} on the first day?`, answer: `Sehri ends at ${h12(rows[0].sehri)} (Fajr) and iftar is at ${h12(rows[0].iftar)} (Maghrib) in ${loc.name} on the first day. By the last day sehri ends at ${h12(rows[rows.length - 1].sehri)} and iftar is at ${h12(rows[rows.length - 1].iftar)}.` },
    { question: "Which method is used?", answer: "The University of Islamic Sciences, Karachi convention (Fajr and Isha at 18 degrees) that Pakistani timetables follow, with a one-minute precaution on Maghrib. Local mosques may add a few minutes; stop eating at your mosque's Fajr adhan to be safe." },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={`Ramadan ${w.year} AH · ${w.running ? "in progress" : "expected"} from ${formatDate(w.first, { day: "numeric", month: "long", year: "numeric" })}`} title={`Ramadan calendar ${gy} for ${loc.name}`} description={`Sehri (Fajr) and iftar (Maghrib) for every day of Ramadan in ${loc.name}. Dates shift by a day if the moon is sighted later than the table.`} />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-[14.5px] tabular">
              <thead>
                <tr className="border-b-2 border-[var(--rule)] text-left text-[12px] uppercase tracking-[0.08em] text-3">
                  <th className="py-2 pr-3 font-semibold">Roza</th>
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Sehri ends</th>
                  <th className="py-2 font-semibold">Iftar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.n} className={`border-b border-line ${r.today ? "bg-surface-2 font-semibold" : ""}`}>
                    <td className="py-2 pr-3">{r.n}</td>
                    <td className="whitespace-nowrap py-2 pr-3">{formatDate(r.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                    <td className="py-2 pr-3">{h12(r.sehri)}</td>
                    <td className="py-2">{h12(r.iftar)}</td>
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
        </div>
        <aside className="space-y-8">
          <div>
            <p className="eyebrow">Other cities</p>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[15px] lg:grid-cols-1">
              {cities
                .filter((c) => c.slug !== loc.slug)
                .map((c) => (
                  <li key={c.slug}>
                    <Link href={`/ramadan-calendar/${c.slug}`} className="underline-offset-4 hover:underline">
                      {c.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Also</p>
            <ul className="mt-2 space-y-1 text-[15px]">
              <li>
                <Link href={`/prayer-times/${loc.slug}`} className="underline-offset-4 hover:underline">
                  {loc.name} prayer times today
                </Link>
              </li>
              <li>
                <Link href="/islamic-date" className="underline-offset-4 hover:underline">
                  Islamic date today
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
