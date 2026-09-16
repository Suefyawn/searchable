import Link from "next/link";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { nowInPakistan, todayCities } from "@/lib/today";
import { HIJRI_MONTHS, pakistanHijri, readHijriOffset, umalquraDate, upcomingIslamicDates } from "@/lib/today/hijri";
import { prayerTimes } from "@/lib/today/prayer";
import { h12 } from "@/lib/today/sun";

export const revalidate = 1800;

export async function generateMetadata() {
  const offset = await readHijriOffset();
  const t = nowInPakistan();
  const h = pakistanHijri(t.date, offset.days);
  return buildMetadata({
    title: `Islamic Date Today in Pakistan: ${h.day} ${h.monthName} ${h.year} AH`,
    description: `Islamic date today in Pakistan: ${h.day} ${h.monthName} ${h.year} AH (${formatDate(t.date, { day: "numeric", month: "long", year: "numeric" })}), per the Ruet-e-Hilal sighting, with the dates of Ramadan, Eid and Muharram ahead.`,
    path: "/islamic-date",
    kicker: "Islamic date",
  });
}

export default async function IslamicDatePage() {
  const [offset, cities] = await Promise.all([readHijriOffset(), todayCities()]);
  const t = nowInPakistan();
  const h = pakistanHijri(t.date, offset.days);
  const table = umalquraDate(t.date);
  const upcoming = upcomingIslamicDates(t.date, offset.days);
  const dateLong = formatDate(t.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const karachi = cities.find((c) => c.slug === "karachi");
  const lahore = cities.find((c) => c.slug === "lahore");
  const kTimes = karachi ? prayerTimes(t.y, t.m, t.d, karachi.lat, karachi.lng) : null;
  const lTimes = lahore ? prayerTimes(t.y, t.m, t.d, lahore.lat, lahore.lng) : null;
  const faqs = [
    { question: "What is the Islamic date today in Pakistan?", answer: `Today, ${dateLong}, is ${h.day} ${h.monthName} ${h.year} AH in Pakistan.${offset.days ? ` Pakistan's date runs ${offset.days > 0 ? "a day ahead of" : "a day behind"} the Umm al-Qura table because the Ruet-e-Hilal Committee sighted the moon ${offset.days > 0 ? "earlier" : "later"}.` : " This matches the Umm al-Qura calendar used by most phones."}` },
    { question: "Why does the Islamic date in Pakistan sometimes differ from Saudi Arabia?", answer: "Pakistan starts each Islamic month on the Ruet-e-Hilal Committee's actual sighting of the new moon, while Saudi Arabia follows the Umm al-Qura calculated calendar and its own sightings. Moonset comes later in Pakistan, so the month often begins a day after Saudi Arabia." },
    { question: "When is Ramadan in Pakistan?", answer: (() => {
        const r = upcoming.find((u) => u.name.startsWith("1 Ramadan"));
        return r ? `The first fast of Ramadan ${r.hijri.split(" ").pop()} AH is expected on ${formatDate(r.on, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, subject to the moon sighting announced the evening before.` : "Announced by the Ruet-e-Hilal Committee the evening before the first fast.";
      })() },
    { question: "When is the Islamic day counted from?", answer: "An Islamic date begins at sunset (Maghrib), not midnight. After Maghrib the date on this page has already moved to the next day in religious terms; the page shows the civil convention, where the date changes at midnight." },
  ];
  const crumbs = [
    { name: "Today", path: "/today" },
    { name: "Islamic date", path: "/islamic-date" },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={dateLong} title="Islamic date today in Pakistan" description="Today's Hijri date as observed in Pakistan, with the Islamic dates people plan around next." />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="border-y-2 border-[var(--rule)] py-6">
            <p className="font-display text-4xl sm:text-5xl">
              {h.day} {h.monthName} {h.year} AH
            </p>
            <p className="mt-2 text-2xl text-2" lang="ur" dir="rtl">
              {h.day} {h.monthUrdu} {h.year} ہجری
            </p>
            <p className="mt-3 text-[14.5px] text-2">
              {offset.days === 0 ? "Same as the Umm al-Qura calendar today." : `Umm al-Qura calendar: ${table.day} ${table.monthName} ${table.year} AH. Pakistan is ${Math.abs(offset.days)} day ${offset.days > 0 ? "ahead" : "behind"} after the Ruet-e-Hilal Committee's sighting.`}
              {offset.note ? ` ${offset.note}` : ""}
            </p>
          </div>

          <SectionHeader title="Upcoming Islamic dates in Pakistan" className="mt-10" description="Expected dates from today's count; each new month is confirmed by the Ruet-e-Hilal Committee the evening before, so a date can move by a day." />
          <div className="divide-y divide-[var(--border)] border-y border-line">
            {upcoming.map((u) => (
              <div key={u.name} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:items-baseline">
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-[13.5px] text-3">{u.hijri} AH</p>
                </div>
                <p className="tabular text-[15px]">{formatDate(u.on, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            ))}
          </div>

          <SectionHeader title="Islamic months" className="mt-10" />
          <ol className="grid grid-cols-2 gap-x-6 gap-y-1 text-[15px] sm:grid-cols-3">
            {HIJRI_MONTHS.map((m, i) => (
              <li key={m.en} className={i + 1 === h.month ? "font-semibold" : ""}>
                <span className="tabular text-3">{i + 1}.</span> {m.en}{" "}
                <span className="text-3" lang="ur" dir="rtl">
                  {m.ur}
                </span>
              </li>
            ))}
          </ol>

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
          {kTimes && lTimes ? (
            <div>
              <p className="eyebrow">Today&apos;s sehri and iftar</p>
              <dl className="mt-2 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1 text-[15px] tabular">
                <dt className="text-3">City</dt>
                <dd className="text-3">Sehri</dd>
                <dd className="text-3">Iftar</dd>
                <dt>
                  <Link href="/prayer-times/karachi" className="underline-offset-4 hover:underline">
                    Karachi
                  </Link>
                </dt>
                <dd>{h12(kTimes.fajr)}</dd>
                <dd>{h12(kTimes.maghrib)}</dd>
                <dt>
                  <Link href="/prayer-times/lahore" className="underline-offset-4 hover:underline">
                    Lahore
                  </Link>
                </dt>
                <dd>{h12(lTimes.fajr)}</dd>
                <dd>{h12(lTimes.maghrib)}</dd>
              </dl>
              <Link href="/prayer-times" className="mt-2 inline-block text-[14px] font-medium underline-offset-4 hover:underline">
                All cities →
              </Link>
            </div>
          ) : null}
          <div>
            <p className="eyebrow">Also today</p>
            <ul className="mt-2 space-y-1 text-[15px]">
              <li>
                <Link href="/weather" className="underline-offset-4 hover:underline">
                  Weather in your city
                </Link>
              </li>
              <li>
                <Link href="/data/gold-24k-tola" className="underline-offset-4 hover:underline">
                  Gold rate today
                </Link>
              </li>
              <li>
                <Link href="/tools/finance/zakat-calculator" className="underline-offset-4 hover:underline">
                  Zakat calculator
                </Link>
              </li>
              <li>
                <Link href="/guides/banking/prize-bond-draw-schedule-2026-and-how-to-check-your-bond-number" className="underline-offset-4 hover:underline">
                  Prize bond draw schedule
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
