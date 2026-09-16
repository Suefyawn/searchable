import Link from "next/link";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { nowInPakistan, todayCities } from "@/lib/today";
import { prayerTimes } from "@/lib/today/prayer";
import { h12 } from "@/lib/today/sun";

export const revalidate = 1800;
export const metadata = buildMetadata({
  title: "Namaz Timings Today in Pakistan: Karachi, Lahore, Islamabad, All Cities",
  description: "Today's namaz timings for every major city in Pakistan: Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha, with sehri and iftar. Karachi method, Hanafi Asr, Pakistan Standard Time.",
  path: "/prayer-times",
  kicker: "Prayer times",
});

export default async function PrayerTimesHub() {
  const cities = await todayCities();
  const t = nowInPakistan();
  const rows = cities.map((c) => ({ ...c, times: prayerTimes(t.y, t.m, t.d, c.lat, c.lng) }));
  const crumbs = [
    { name: "Today", path: "/today" },
    { name: "Prayer times", path: "/prayer-times" },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={formatDate(t.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} title="Prayer times today in Pakistan" description="Fajr to Isha for every major city, with sehri and iftar. Open a city for the week ahead and the calculation method." />
      <div className="overflow-x-auto">
        <table className="w-full text-[14.5px] tabular">
          <thead>
            <tr className="border-b-2 border-[var(--rule)] text-left text-[12px] uppercase tracking-[0.08em] text-3">
              <th className="py-2 pr-3 font-semibold">City</th>
              <th className="py-2 pr-3 font-semibold">Fajr</th>
              <th className="py-2 pr-3 font-semibold">Sunrise</th>
              <th className="py-2 pr-3 font-semibold">Dhuhr</th>
              <th className="py-2 pr-3 font-semibold">Asr</th>
              <th className="py-2 pr-3 font-semibold">Maghrib</th>
              <th className="py-2 pr-3 font-semibold">Isha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b border-line">
                <td className="py-2.5 pr-3 font-semibold">
                  <Link href={`/prayer-times/${r.slug}`} className="underline-offset-4 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="py-2.5 pr-3 whitespace-nowrap">{h12(r.times.fajr)}</td>
                <td className="py-2.5 pr-3 whitespace-nowrap">{h12(r.times.sunrise)}</td>
                <td className="py-2.5 pr-3 whitespace-nowrap">{h12(r.times.dhuhr)}</td>
                <td className="py-2.5 pr-3 whitespace-nowrap">{h12(r.times.asr)}</td>
                <td className="py-2.5 pr-3 whitespace-nowrap">{h12(r.times.maghrib)}</td>
                <td className="py-2.5 pr-3 whitespace-nowrap">{h12(r.times.isha)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[14px] text-2">University of Islamic Sciences, Karachi convention (18° Fajr and Isha), Hanafi Asr, one-minute precaution on Dhuhr and Maghrib. Sehri ends at Fajr; iftar is at Maghrib.</p>
    </div>
  );
}
