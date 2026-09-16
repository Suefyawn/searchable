import Link from "next/link";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { nowInPakistan, todayCities } from "@/lib/today";
import { ramadanWindow, readHijriOffset } from "@/lib/today/hijri";
import { prayerTimes } from "@/lib/today/prayer";
import { h12 } from "@/lib/today/sun";

export const revalidate = 3600;

export async function generateMetadata() {
  const offset = await readHijriOffset();
  const w = ramadanWindow(new Date(), offset.days);
  const gy = w?.first.getFullYear() ?? new Date().getFullYear();
  return buildMetadata({
    title: `Ramadan Calendar ${gy} Pakistan: Sehri and Iftar Times by City`,
    description: `Ramadan ${gy} in Pakistan: the expected first fast, and sehri and iftar timings for all 30 days in Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Peshawar, Multan, Quetta and every major city.`,
    path: "/ramadan-calendar",
    kicker: "Ramadan",
  });
}

export default async function RamadanHub() {
  const [cities, offset] = await Promise.all([todayCities(), readHijriOffset()]);
  const t = nowInPakistan();
  const w = ramadanWindow(t.date, offset.days);
  const crumbs = [
    { name: "Today", path: "/today" },
    { name: "Ramadan calendar", path: "/ramadan-calendar" },
  ];
  if (!w) return null;
  const first = new Date(w.first.getTime() + 5 * 3_600_000);
  const rows = cities.map((c) => ({ ...c, p: prayerTimes(first.getUTCFullYear(), first.getUTCMonth() + 1, first.getUTCDate(), c.lat, c.lng) }));
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={`Ramadan ${w.year} AH`} title={`Ramadan calendar ${w.first.getFullYear()} Pakistan`} description={`First fast ${w.running ? "was" : "expected"} on ${formatDate(w.first, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, subject to the moon sighting. Pick your city for all 30 days of sehri and iftar times.`} />
      <div className="overflow-x-auto">
        <table className="w-full text-[14.5px] tabular">
          <thead>
            <tr className="border-b-2 border-[var(--rule)] text-left text-[12px] uppercase tracking-[0.08em] text-3">
              <th className="py-2 pr-3 font-semibold">City</th>
              <th className="py-2 pr-3 font-semibold">Sehri ends, day 1</th>
              <th className="py-2 font-semibold">Iftar, day 1</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b border-line">
                <td className="py-2.5 pr-3 font-semibold">
                  <Link href={`/ramadan-calendar/${r.slug}`} className="underline-offset-4 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-3">{h12(r.p.fajr)}</td>
                <td className="py-2.5">{h12(r.p.maghrib)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[14px] text-2">
        Karachi calculation method, Hanafi timetable, one-minute precaution on Maghrib. Today&apos;s Islamic date: <Link href="/islamic-date" className="underline underline-offset-4">see the date and the upcoming Eid dates</Link>.
      </p>
    </div>
  );
}
