import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { addDataPoint } from "@/db/queries/data";

/**
 * Automated data ingestion for the data hub. Each source fetches once and yields readings for several series.
 * Readings are sanity-checked against the previous value (a parser that suddenly returns garbage is rejected,
 * not published) and written through addDataPoint(), which upserts on (series, date).
 *
 * Sources (all verified reachable 2026-09-15):
 *  - SBP economic-data snapshot page: USD/PKR M2M rate, KIBOR 12-month offer, policy rate
 *  - open.er-api.com: USD cross rates → AED, SAR, GBP, EUR against PKR (using SBP's USD/PKR so all FX is interbank-based)
 *  - PSO fuel prices page: Premier Euro 5 petrol and Hi-Cetane diesel, ex-depot Karachi
 *  - gold-api.com spot XAU/XAG → per-tola PKR via SBP USD/PKR (Sarafa quotes track spot within ~1%)
 */

const UA = "SearchablePK/0.1 (https://searchable.pk; data@searchable.pk)";
const TOLA_PER_OZ = 11.664 / 31.1035;

export type Reading = { slug: string; value: number; date: string; note: string; sourceUrl: string };
export type IngestResult = { slug: string; status: "written" | "unchanged" | "rejected" | "error" | "no-series"; value?: number; previous?: number; message?: string };

const today = () => new Date().toISOString().slice(0, 10);
const text = async (url: string) => {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
};
const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/\s+/g, " ");

/* ── SBP snapshot: USD/PKR, KIBOR, policy rate ─────────────────────────── */
async function sbp(): Promise<{ usd: number | null; kibor12: number | null; policy: number | null; asOf: string }> {
  const url = "https://www.sbp.org.pk/ecodata/kibor_index.asp";
  const t = strip(await text(url));
  const usd = t.match(/M2M Revaluation Rate\s*([\d.]+)/i)?.[1];
  const kibor = t.match(/12-M\s+([\d.]+)\s+([\d.]+)/)?.[2];
  const policy = t.match(/SBP Policy Rate\s*([\d.]+)%/i)?.[1];
  const asOf = t.match(/KIBOR As on\s*([\d]{1,2}-\s*[A-Za-z]{3}\s*-\s*\d{2,4})/i)?.[1] ?? "";
  return { usd: usd ? Number(usd) : null, kibor12: kibor ? Number(kibor) : null, policy: policy ? Number(policy) : null, asOf };
}

/* ── FX cross rates ────────────────────────────────────────────────────── */
async function erApi(): Promise<Record<string, number>> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", { headers: { "user-agent": UA }, cache: "no-store" });
  if (!res.ok) throw new Error(`er-api → ${res.status}`);
  const d = (await res.json()) as { result: string; rates: Record<string, number> };
  if (d.result !== "success") throw new Error("er-api result not success");
  return d.rates;
}

/* ── PSO fuel prices ───────────────────────────────────────────────────── */
async function pso(): Promise<{ petrol: number | null; diesel: number | null; effective: string }> {
  const t = strip(await text("https://psopk.com/en/fuels/fuel-prices"));
  const petrol = t.match(/PREMIER EURO 5\s*Rs\.?\s*([\d.]+)\s*\/?\s*Ltr/i)?.[1];
  const diesel = t.match(/HI-CETANE DIESEL EURO 5\s*Rs\.?\s*([\d.]+)\s*\/?\s*Ltr/i)?.[1];
  const effective = t.match(/Effective From:\s*([A-Za-z]+ \d{1,2}, \d{4})/i)?.[1] ?? "";
  return { petrol: petrol ? Number(petrol) : null, diesel: diesel ? Number(diesel) : null, effective };
}

/* ── Gold / silver spot ────────────────────────────────────────────────── */
async function spot(symbol: "XAU" | "XAG"): Promise<number> {
  const res = await fetch(`https://api.gold-api.com/price/${symbol}`, { headers: { "user-agent": UA }, cache: "no-store" });
  if (!res.ok) throw new Error(`gold-api ${symbol} → ${res.status}`);
  const d = (await res.json()) as { price: number };
  if (!d.price) throw new Error(`gold-api ${symbol}: no price`);
  return d.price;
}

/** Collect readings from every source; a failing source only loses its own series. */
export async function collectReadings(): Promise<{ readings: Reading[]; errors: string[] }> {
  const readings: Reading[] = [];
  const errors: string[] = [];
  const date = today();
  let usdPkr: number | null = null;

  try {
    const s = await sbp();
    usdPkr = s.usd;
    const note = `SBP snapshot${s.asOf ? `, as on ${s.asOf}` : ""} (auto)`;
    const url = "https://www.sbp.org.pk/ecodata/kibor_index.asp";
    if (s.usd) readings.push({ slug: "usd-pkr", value: s.usd, date, note: `M2M revaluation rate — ${note}`, sourceUrl: url });
    if (s.kibor12) readings.push({ slug: "kibor-1y", value: s.kibor12, date, note: `12-month KIBOR offer — ${note}`, sourceUrl: url });
    if (s.policy) readings.push({ slug: "sbp-policy-rate", value: s.policy, date, note: `Policy rate — ${note}`, sourceUrl: url });
  } catch (e) {
    errors.push(`SBP: ${(e as Error).message}`);
  }

  try {
    const rates = await erApi();
    const base = usdPkr ?? rates.PKR;
    const src = usdPkr ? "SBP USD/PKR × open.er-api.com cross rate (auto)" : "open.er-api.com (auto)";
    for (const [code, slug] of [["AED", "aed-pkr"], ["SAR", "sar-pkr"], ["GBP", "gbp-pkr"], ["EUR", "eur-pkr"]] as const) {
      if (rates[code]) readings.push({ slug, value: Number((base / rates[code]).toFixed(2)), date, note: src, sourceUrl: "https://open.er-api.com/v6/latest/USD" });
    }
    if (!usdPkr && rates.PKR) readings.push({ slug: "usd-pkr", value: Number(rates.PKR.toFixed(2)), date, note: "open.er-api.com market mid (auto; SBP unavailable)", sourceUrl: "https://open.er-api.com/v6/latest/USD" });
  } catch (e) {
    errors.push(`FX: ${(e as Error).message}`);
  }

  try {
    const p = await pso();
    const note = `PSO ex-depot price${p.effective ? `, effective ${p.effective}` : ""} (auto)`;
    const url = "https://psopk.com/en/fuels/fuel-prices";
    if (p.petrol) readings.push({ slug: "petrol-price", value: p.petrol, date, note, sourceUrl: url });
    if (p.diesel) readings.push({ slug: "diesel-price", value: p.diesel, date, note, sourceUrl: url });
  } catch (e) {
    errors.push(`PSO: ${(e as Error).message}`);
  }

  try {
    const fx = usdPkr ?? (await erApi()).PKR;
    const [xau, xag] = await Promise.all([spot("XAU"), spot("XAG")]);
    const tola24 = Math.round(xau * TOLA_PER_OZ * fx);
    readings.push({ slug: "gold-24k-tola", value: tola24, date, note: `Spot $${xau.toFixed(0)}/oz × Rs ${fx.toFixed(2)} (auto; Sarafa quotes track spot within ~1%)`, sourceUrl: "https://gold-api.com" });
    readings.push({ slug: "gold-22k-tola", value: Math.round(tola24 * (22 / 24)), date, note: "22/24 of the 24K reading (auto)", sourceUrl: "https://gold-api.com" });
    readings.push({ slug: "silver-tola", value: Math.round(xag * TOLA_PER_OZ * fx), date, note: `Spot $${xag.toFixed(2)}/oz × Rs ${fx.toFixed(2)} (auto)`, sourceUrl: "https://gold-api.com" });
  } catch (e) {
    errors.push(`Gold: ${(e as Error).message}`);
  }

  return { readings, errors };
}

/** Write readings, rejecting anything that moved more than `maxJump` (fraction) from the last stored value. */
export async function runIngestion(opts: { maxJump?: number; only?: string[]; force?: boolean } = {}): Promise<{ results: IngestResult[]; errors: string[]; at: string }> {
  const maxJump = opts.maxJump ?? 0.3;
  const db = await getDb();
  const { readings, errors } = await collectReadings();
  const results: IngestResult[] = [];
  for (const r of readings) {
    if (opts.only?.length && !opts.only.includes(r.slug)) continue;
    const series = await db.query.dataSeries.findFirst({ where: eq(schema.dataSeries.slug, r.slug), columns: { id: true } });
    if (!series) {
      results.push({ slug: r.slug, status: "no-series" });
      continue;
    }
    const prev = await db.query.dataPoints.findFirst({ where: eq(schema.dataPoints.seriesId, series.id), orderBy: [desc(schema.dataPoints.date)], columns: { value: true, date: true } });
    if (prev && prev.date === r.date && prev.value === r.value) {
      results.push({ slug: r.slug, status: "unchanged", value: r.value });
      continue;
    }
    if (prev && !opts.force && Math.abs(r.value - prev.value) / Math.max(1, Math.abs(prev.value)) > maxJump) {
      results.push({ slug: r.slug, status: "rejected", value: r.value, previous: prev.value, message: `Moved ${Math.round((Math.abs(r.value - prev.value) / Math.abs(prev.value)) * 100)}% from last reading — review and force if genuine` });
      continue;
    }
    try {
      await addDataPoint(series.id, r.date, r.value, r.note, r.sourceUrl);
      results.push({ slug: r.slug, status: "written", value: r.value, previous: prev?.value });
    } catch (e) {
      results.push({ slug: r.slug, status: "error", message: (e as Error).message });
    }
  }
  const at = new Date().toISOString();
  await db.insert(schema.settings).values({ key: "ingest:last", value: { at, results, errors } }).onConflictDoUpdate({ target: schema.settings.key, set: { value: { at, results, errors }, updatedAt: new Date() } });
  return { results, errors, at };
}
