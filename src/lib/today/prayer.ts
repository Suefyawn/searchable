import { hourAngle, julianDay, solarConstants } from "./sun";

/*
 * Prayer times the way Pakistani timetables compute them: the University of Islamic Sciences, Karachi
 * convention (Fajr and Isha at 18 degrees below the horizon), Asr by the Hanafi rule (shadow twice the
 * object's length) with the Shafi rule (once) as an option. Sehri ends at Fajr, iftar is at Maghrib.
 * Results are local hours (Pakistan Standard Time, UTC+5, no daylight saving).
 */

export type AsrRule = "hanafi" | "shafi";

export type PrayerDay = {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
  /** Midpoint of sunset and Fajr, after which Isha should not be delayed. */
  midnight: number;
};

const RAD = Math.PI / 180;

export const PRAYER_LABELS: { key: keyof PrayerDay; label: string; urdu: string }[] = [
  { key: "fajr", label: "Fajr", urdu: "فجر" },
  { key: "sunrise", label: "Sunrise", urdu: "طلوع آفتاب" },
  { key: "dhuhr", label: "Dhuhr", urdu: "ظہر" },
  { key: "asr", label: "Asr", urdu: "عصر" },
  { key: "maghrib", label: "Maghrib", urdu: "مغرب" },
  { key: "isha", label: "Isha", urdu: "عشاء" },
];

/** Asr: the hour angle at which the shadow equals `factor` times the object plus its noon shadow. */
function asrAngle(lat: number, declination: number, factor: number): number {
  const noonShadow = Math.abs(lat - declination);
  const altitude = Math.atan(1 / (factor + Math.tan(noonShadow * RAD))) / RAD;
  return hourAngle(lat, declination, altitude);
}

export function prayerTimes(y: number, m: number, d: number, lat: number, lng: number, opts: { asr?: AsrRule; tzHours?: number; fajrAngle?: number; ishaAngle?: number } = {}): PrayerDay {
  const tz = opts.tzHours ?? 5;
  const fajrAngle = opts.fajrAngle ?? 18;
  const ishaAngle = opts.ishaAngle ?? 18;
  const jd = julianDay(y, m, d) + 0.5 - tz / 24;
  const { eqTime, declination } = solarConstants(jd);
  const noon = (720 - 4 * lng - eqTime) / 60 + tz;
  const rise = hourAngle(lat, declination, -0.833) / 15;
  const fajr = noon - hourAngle(lat, declination, -fajrAngle) / 15;
  const isha = noon + hourAngle(lat, declination, -ishaAngle) / 15;
  const asr = noon + asrAngle(lat, declination, opts.asr === "shafi" ? 1 : 2) / 15;
  const sunset = noon + rise;
  // Timetables round Dhuhr and Maghrib up by a minute or two as a precaution; we add one minute each.
  const dhuhr = noon + 1 / 60;
  const maghrib = sunset + 1 / 60;
  const fajrNext = fajr + 24;
  return { fajr, sunrise: noon - rise, dhuhr, asr, maghrib, isha, midnight: (sunset + fajrNext) / 2 };
}

/** Which prayer is next at `nowHours` (local), and the one before it. */
export function currentPrayer(t: PrayerDay, nowHours: number): { current: keyof PrayerDay | null; next: keyof PrayerDay; inHours: number } {
  const order: (keyof PrayerDay)[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
  for (let i = 0; i < order.length; i++) {
    if (nowHours < t[order[i]]) return { current: i ? order[i - 1] : null, next: order[i], inHours: t[order[i]] - nowHours };
  }
  return { current: "isha", next: "fajr", inHours: t.fajr + 24 - nowHours };
}
