/*
 * Solar position for one day at one place, after the NOAA solar calculator (Meeus, Astronomical
 * Algorithms). Accurate to about a minute, which is what prayer timetables and "sunset today" need.
 * Everything here is pure: a civil date, a latitude and longitude in degrees, results in fractional
 * hours of local time for the given UTC offset.
 */

const RAD = Math.PI / 180;

export type SunDay = {
  /** Local time in hours, e.g. 6.35 for 06:21. NaN when the sun never rises or sets (polar). */
  sunrise: number;
  sunset: number;
  solarNoon: number;
  /** Equation of time, minutes. */
  eqTime: number;
  /** Solar declination, degrees. */
  declination: number;
};

/** Julian day at 0h UT of a civil date. */
export function julianDay(y: number, m: number, d: number): number {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

/** Equation of time (minutes) and declination (degrees) for a Julian day, NOAA's series. */
export function solarConstants(jd: number): { eqTime: number; declination: number } {
  const t = (jd - 2451545) / 36525;
  const l0 = ((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360 + 360) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c = Math.sin(m * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * m * RAD) * (0.019993 - 0.000101 * t) + Math.sin(3 * m * RAD) * 0.000289;
  const trueLong = l0 + c;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const declination = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) / RAD;
  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eq = y * Math.sin(2 * l0 * RAD) - 2 * e * Math.sin(m * RAD) + 4 * e * y * Math.sin(m * RAD) * Math.cos(2 * l0 * RAD) - 0.5 * y * y * Math.sin(4 * l0 * RAD) - 1.25 * e * e * Math.sin(2 * m * RAD);
  return { eqTime: (4 * eq) / RAD, declination };
}

/**
 * Hour angle (degrees) at which the sun's centre reaches `altitude` degrees (negative below the horizon).
 * NaN when it never does on that day.
 */
export function hourAngle(lat: number, declination: number, altitude: number): number {
  const cosH = (Math.sin(altitude * RAD) - Math.sin(lat * RAD) * Math.sin(declination * RAD)) / (Math.cos(lat * RAD) * Math.cos(declination * RAD));
  if (cosH < -1 || cosH > 1) return NaN;
  return Math.acos(cosH) / RAD;
}

/** Sunrise, sunset and noon for a date at a place, in local hours for `tzHours` (Pakistan is 5). */
export function sunTimes(y: number, m: number, d: number, lat: number, lng: number, tzHours = 5): SunDay {
  // Constants at local noon give better rise and set times than 0h UT for longitudes far from Greenwich.
  const jd = julianDay(y, m, d) + 0.5 - tzHours / 24;
  const { eqTime, declination } = solarConstants(jd);
  const solarNoon = (720 - 4 * lng - eqTime) / 60 + tzHours;
  // Standard refraction plus the sun's semi-diameter: centre at -0.833 degrees.
  const h = hourAngle(lat, declination, -0.833);
  return { sunrise: solarNoon - h / 15, sunset: solarNoon + h / 15, solarNoon, eqTime, declination };
}

/** 6.35 → "06:21". Rounds to the nearest minute; NaN → "-". */
export function hhmm(hours: number): string {
  if (!Number.isFinite(hours)) return "-";
  const total = Math.round(hours * 60);
  const h = ((Math.floor(total / 60) % 24) + 24) % 24;
  const mm = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "06:21" in 12-hour form, "6:21 am". */
export function h12(hours: number): string {
  if (!Number.isFinite(hours)) return "-";
  const total = Math.round(hours * 60);
  const h24 = ((Math.floor(total / 60) % 24) + 24) % 24;
  const mm = ((total % 60) + 60) % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(mm).padStart(2, "0")} ${h24 < 12 ? "am" : "pm"}`;
}
