import { listSeriesWithLatest, type SeriesSummary } from "@/db/queries/data";
import type { ToolInput } from "./types";

export type LiveDefault = { key: string; value: number; label: string; seriesSlug: string; date: string };

/**
 * Maps data-hub series onto calculator fields so tools open with today's numbers.
 * The "one number → seven products" link: a reading in /admin/data updates these on the next render.
 */
const MAP: Record<string, { key: string; series: string; label: string; transform?: (v: number) => number }[]> = {
  "fuel-cost-calculator": [{ key: "price", series: "petrol-price", label: "Petrol price" }],
  "fuel-average-calculator": [{ key: "price", series: "petrol-price", label: "Petrol price" }],
  "gold-converter": [{ key: "price", series: "gold-24k-tola", label: "Gold 24K per tola" }],
  "solar-panel-calculator": [{ key: "perWatt", series: "solar-panel-per-watt", label: "Panel price per watt" }],
  "pta-mobile-tax-calculator": [{ key: "usdPkr", series: "usd-pkr", label: "USD/PKR interbank" }],
  "zakat-calculator": [
    { key: "goldPrice", series: "gold-24k-tola", label: "Gold 24k per gram", transform: (v) => Math.round(v / 11.664) },
    { key: "silverPrice", series: "silver-tola", label: "Silver per gram", transform: (v) => Math.round(v / 11.664) },
  ],
  "car-loan-calculator": [{ key: "rate", series: "kibor-1y", label: "1-year KIBOR + 3% spread", transform: (v) => v + 3 }],
  "home-loan-calculator": [{ key: "rate", series: "kibor-1y", label: "1-year KIBOR + 3% spread", transform: (v) => v + 3 }],
  "personal-loan-calculator": [{ key: "rate", series: "kibor-1y", label: "1-year KIBOR + 10% spread", transform: (v) => v + 10 }],
  "currency-converter": [
    { key: "usd", series: "usd-pkr", label: "USD/PKR interbank" },
    { key: "aed", series: "aed-pkr", label: "AED/PKR interbank" },
    { key: "sar", series: "sar-pkr", label: "SAR/PKR interbank" },
    { key: "gbp", series: "gbp-pkr", label: "GBP/PKR interbank" },
    { key: "eur", series: "eur-pkr", label: "EUR/PKR interbank" },
  ],
  "salary-increment-calculator": [{ key: "inflation", series: "cpi-yoy", label: "CPI inflation (latest month)" }],
};

export async function liveDefaults(toolSlug: string): Promise<{ input: ToolInput; sources: LiveDefault[] }> {
  const map = MAP[toolSlug];
  if (!map) return { input: {}, sources: [] };
  let series: SeriesSummary[] = [];
  try {
    series = await listSeriesWithLatest();
  } catch {
    return { input: {}, sources: [] };
  }
  const input: ToolInput = {};
  const sources: LiveDefault[] = [];
  for (const m of map) {
    const s = series.find((x) => x.slug === m.series);
    if (!s?.latest) continue;
    const value = Number((m.transform ? m.transform(s.latest.value) : s.latest.value).toFixed(2));
    input[m.key] = value;
    sources.push({ key: m.key, value, label: m.label, seriesSlug: s.slug, date: s.latest.date });
  }
  return { input, sources };
}
