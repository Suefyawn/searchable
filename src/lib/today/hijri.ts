import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";

/*
 * Islamic date for Pakistan. The calendar is the Umm al-Qura tabular calendar (what every phone shows),
 * shifted by the Ruet-e-Hilal Committee's sighting when it differs: the offset lives in a settings row the
 * task or an editor sets when the committee announces a new month a day earlier or later than the table.
 */

export const HIJRI_MONTHS = [
  { en: "Muharram", ur: "محرم" },
  { en: "Safar", ur: "صفر" },
  { en: "Rabi al-Awwal", ur: "ربیع الاول" },
  { en: "Rabi al-Thani", ur: "ربیع الثانی" },
  { en: "Jumada al-Awwal", ur: "جمادی الاول" },
  { en: "Jumada al-Thani", ur: "جمادی الثانی" },
  { en: "Rajab", ur: "رجب" },
  { en: "Shaban", ur: "شعبان" },
  { en: "Ramadan", ur: "رمضان" },
  { en: "Shawwal", ur: "شوال" },
  { en: "Dhul Qadah", ur: "ذوالقعدہ" },
  { en: "Dhul Hijjah", ur: "ذوالحجہ" },
];

export type HijriDate = { day: number; month: number; year: number; monthName: string; monthUrdu: string };

const fmt = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Asia/Karachi" });

/** Umm al-Qura date of a UTC instant, read in Pakistan's day. */
export function umalquraDate(at: Date): HijriDate {
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const month = Number(parts.month);
  const year = Number(String(parts.year).replace(/\D/g, ""));
  return { day: Number(parts.day), month, year, monthName: HIJRI_MONTHS[month - 1]?.en ?? "", monthUrdu: HIJRI_MONTHS[month - 1]?.ur ?? "" };
}

export const HijriOffset = z.object({
  /** Days to add to the Umm al-Qura date for Pakistan: -1, 0 or 1. */
  days: z.number().int().min(-2).max(2).default(0),
  /** What the committee announced, e.g. "Ruet-e-Hilal: 1 Rabi al-Awwal on 24 August 2026". */
  note: z.string().max(300).optional(),
  /** Source of the announcement. */
  sourceUrl: z.string().url().max(300).optional(),
  setAt: z.string().optional(),
});
export type HijriOffsetT = z.infer<typeof HijriOffset>;

export async function readHijriOffset(): Promise<HijriOffsetT> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, "today:hijri") });
  const parsed = HijriOffset.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : { days: 0 };
}

export async function writeHijriOffset(input: Omit<HijriOffsetT, "setAt">): Promise<HijriOffsetT> {
  const db = await getDb();
  const value = { ...HijriOffset.parse(input), setAt: new Date().toISOString() };
  await db.insert(schema.settings).values({ key: "today:hijri", value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  return value;
}

/** Pakistan's Islamic date for an instant: the table shifted by the sighting offset. */
export function pakistanHijri(at: Date, offsetDays: number): HijriDate {
  return umalquraDate(new Date(at.getTime() - offsetDays * 86_400_000));
}

/** Gregorian day (in Pakistan) on which a Hijri date falls, searching a window of days around `near`. */
export function gregorianFor(target: { day: number; month: number; year: number }, offsetDays: number, near: Date): Date | null {
  for (let i = -400; i <= 400; i++) {
    const at = new Date(near.getTime() + i * 86_400_000);
    const h = pakistanHijri(at, offsetDays);
    if (h.day === target.day && h.month === target.month && h.year === target.year) return at;
  }
  return null;
}

/** Dates people look up, next occurrence from `now`. */
export function upcomingIslamicDates(now: Date, offsetDays: number): { name: string; hijri: string; on: Date }[] {
  const today = pakistanHijri(now, offsetDays);
  const events: { name: string; day: number; month: number }[] = [
    { name: "1 Muharram (Islamic New Year)", day: 1, month: 1 },
    { name: "Ashura (10 Muharram)", day: 10, month: 1 },
    { name: "12 Rabi al-Awwal (Eid Milad un Nabi)", day: 12, month: 3 },
    { name: "27 Rajab (Shab-e-Miraj)", day: 27, month: 7 },
    { name: "15 Shaban (Shab-e-Barat)", day: 15, month: 8 },
    { name: "1 Ramadan (first fast)", day: 1, month: 9 },
    { name: "27 Ramadan (Laylat al-Qadr, most observed night)", day: 27, month: 9 },
    { name: "Eid ul Fitr (1 Shawwal)", day: 1, month: 10 },
    { name: "Day of Arafah (9 Dhul Hijjah)", day: 9, month: 12 },
    { name: "Eid ul Adha (10 Dhul Hijjah)", day: 10, month: 12 },
  ];
  const out: { name: string; hijri: string; on: Date }[] = [];
  for (const e of events) {
    const inThisYear = e.month > today.month || (e.month === today.month && e.day >= today.day);
    const year = inThisYear ? today.year : today.year + 1;
    const on = gregorianFor({ day: e.day, month: e.month, year }, offsetDays, now);
    if (on) out.push({ name: e.name, hijri: `${e.day} ${HIJRI_MONTHS[e.month - 1].en} ${year}`, on });
  }
  return out.sort((a, b) => a.on.getTime() - b.on.getTime());
}

/** The Ramadan to show: the current one while it runs, otherwise the next. */
export function ramadanWindow(now: Date, offsetDays: number) {
  const h = pakistanHijri(now, offsetDays);
  const year = h.month > 9 ? h.year + 1 : h.year;
  const first = gregorianFor({ day: 1, month: 9, year }, offsetDays, now);
  if (!first) return null;
  const days: { n: number; date: Date }[] = [];
  for (let n = 1; n <= 30; n++) {
    const d = new Date(first.getTime() + (n - 1) * 86_400_000);
    if (pakistanHijri(d, offsetDays).month !== 9) break;
    days.push({ n, date: d });
  }
  return { year, first, days, running: h.month === 9 };
}
