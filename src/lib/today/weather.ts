/*
 * City weather from MET Norway's Locationforecast (free, no key, CC BY 4.0 with attribution; the terms ask
 * for an identifying User-Agent and sensible caching). One request per city every 30 minutes through the
 * Next fetch cache, so twenty cities cost under a thousand calls a day.
 */

const UA = "searchable.pk weather pages (jetnine.inc@gmail.com)";
const TZ = "Asia/Karachi";

export type Hour = { at: Date; temp: number; symbol: string; rainMm: number; windKmh: number; humidity: number };
export type Day = { date: string; weekday: string; min: number; max: number; symbol: string; rainMm: number };
export type Forecast = {
  updatedAt: Date;
  now: Hour & { feelsLike: number; pressure: number; cloud: number; windFrom: string };
  hours: Hour[];
  days: Day[];
};

type Series = {
  time: string;
  data: {
    instant: { details: { air_temperature: number; relative_humidity: number; wind_speed: number; wind_from_direction: number; cloud_area_fraction: number; air_pressure_at_sea_level: number } };
    next_1_hours?: { summary: { symbol_code: string }; details: { precipitation_amount?: number } };
    next_6_hours?: { summary: { symbol_code: string }; details: { precipitation_amount?: number; air_temperature_max?: number; air_temperature_min?: number } };
    next_12_hours?: { summary: { symbol_code: string } };
  };
};

const SYMBOL_WORDS: Record<string, string> = {
  clearsky: "Clear",
  fair: "Mostly clear",
  partlycloudy: "Partly cloudy",
  cloudy: "Cloudy",
  fog: "Fog",
  lightrainshowers: "Light showers",
  rainshowers: "Showers",
  heavyrainshowers: "Heavy showers",
  lightrain: "Light rain",
  rain: "Rain",
  heavyrain: "Heavy rain",
  lightrainshowersandthunder: "Showers with thunder",
  rainshowersandthunder: "Showers with thunder",
  heavyrainshowersandthunder: "Heavy showers with thunder",
  lightrainandthunder: "Rain with thunder",
  rainandthunder: "Rain with thunder",
  heavyrainandthunder: "Heavy rain with thunder",
  lightsleet: "Light sleet",
  sleet: "Sleet",
  heavysleet: "Heavy sleet",
  lightsnow: "Light snow",
  snow: "Snow",
  heavysnow: "Heavy snow",
  lightsnowshowers: "Snow showers",
  snowshowers: "Snow showers",
  heavysnowshowers: "Heavy snow showers",
};

/** "partlycloudy_night" → "Partly cloudy". */
export function describeSymbol(code: string): string {
  const base = code.replace(/_(day|night|polartwilight)$/, "");
  return SYMBOL_WORDS[base] ?? base.replace(/([a-z])and([a-z])/g, "$1 and $2");
}

/** Feels-like: heat index above 27 C, wind chill below 10 C, else the air temperature. */
export function feelsLike(tempC: number, humidity: number, windKmh: number): number {
  if (tempC >= 27) {
    const t = tempC * 1.8 + 32;
    const r = humidity;
    const hi = -42.379 + 2.04901523 * t + 10.14333127 * r - 0.22475541 * t * r - 0.00683783 * t * t - 0.05481717 * r * r + 0.00122874 * t * t * r + 0.00085282 * t * r * r - 0.00000199 * t * t * r * r;
    return Math.round(((hi - 32) / 1.8) * 10) / 10;
  }
  if (tempC <= 10 && windKmh > 4.8) {
    return Math.round((13.12 + 0.6215 * tempC - 11.37 * windKmh ** 0.16 + 0.3965 * tempC * windKmh ** 0.16) * 10) / 10;
  }
  return tempC;
}

function compass(deg: number): string {
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return names[Math.round(deg / 45) % 8];
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const weekday = new Intl.DateTimeFormat("en-PK", { timeZone: TZ, weekday: "short" });
const hourOf = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", hour12: false });

function toHour(s: Series): Hour {
  const d = s.data.instant.details;
  const next = s.data.next_1_hours ?? s.data.next_6_hours;
  return { at: new Date(s.time), temp: d.air_temperature, symbol: next?.summary.symbol_code ?? "cloudy", rainMm: next?.details.precipitation_amount ?? 0, windKmh: Math.round(d.wind_speed * 3.6), humidity: Math.round(d.relative_humidity) };
}

/** Pick the daytime symbol for a day: the 6-hour summary starting nearest 08:00 local, else the most common. */
function daySymbol(rows: Series[]): string {
  const morning = rows.find((r) => Number(hourOf.format(new Date(r.time))) >= 8 && r.data.next_6_hours);
  if (morning?.data.next_6_hours) return morning.data.next_6_hours.summary.symbol_code;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const c = r.data.next_1_hours?.summary.symbol_code;
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "cloudy";
}

export async function fetchForecast(lat: number, lng: number): Promise<Forecast | null> {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(3)}&lon=${lng.toFixed(3)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { "user-agent": UA }, next: { revalidate: 1800 } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json()) as { properties: { meta: { updated_at: string }; timeseries: Series[] } };
  const series = json.properties.timeseries;
  if (!series.length) return null;
  const nowMs = Date.now();
  // The first row at or before now is the current hour; rows are hourly for two days, then six-hourly.
  const current = [...series].reverse().find((s) => new Date(s.time).getTime() <= nowMs) ?? series[0];
  const d = current.data.instant.details;
  const nowHour = toHour(current);
  const hours = series.filter((s) => new Date(s.time).getTime() > new Date(current.time).getTime()).slice(0, 24).map(toHour);
  const byDay = new Map<string, Series[]>();
  for (const s of series) {
    const k = dayKey.format(new Date(s.time));
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const days: Day[] = [...byDay.entries()].slice(0, 7).map(([date, rows]) => {
    const temps = rows.flatMap((r) => [r.data.instant.details.air_temperature, r.data.next_6_hours?.details.air_temperature_max ?? NaN, r.data.next_6_hours?.details.air_temperature_min ?? NaN]).filter(Number.isFinite);
    const rain = rows.reduce((sum, r) => sum + (r.data.next_1_hours?.details.precipitation_amount ?? (r.data.next_6_hours?.details.precipitation_amount ?? 0) / 6), 0);
    return { date, weekday: weekday.format(new Date(rows[0].time)), min: Math.round(Math.min(...temps)), max: Math.round(Math.max(...temps)), symbol: daySymbol(rows), rainMm: Math.round(rain * 10) / 10 };
  });
  return {
    updatedAt: new Date(json.properties.meta.updated_at),
    now: { ...nowHour, feelsLike: feelsLike(d.air_temperature, d.relative_humidity, nowHour.windKmh), pressure: Math.round(d.air_pressure_at_sea_level), cloud: Math.round(d.cloud_area_fraction), windFrom: compass(d.wind_from_direction) },
    hours,
    days,
  };
}
