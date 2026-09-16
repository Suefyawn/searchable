import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { addDataPoint } from "@/db/queries/data";
import { indexDataSeries } from "./indexers";

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
 *  - PSX data portal: KSE-100 index level
 *  - CoinGecko simple price: BTC and ETH in USD
 */

// sbp.org.pk answers 403 to any user agent that does not start with "Mozilla/5.0" from Pakistan, and 403 to
// everything from the Vercel functions (tested from Tokyo), so KIBOR and the policy rate stay with the
// editorial task. The string names us and gives a contact, as a crawler should.
const UA = "Mozilla/5.0 (compatible; SearchablePK/0.1; +https://searchable.pk; data@searchable.pk)";
const TOLA_PER_OZ = 11.664 / 31.1035;

export type Reading = { slug: string; value: number; date: string; note: string; sourceUrl: string };
export type IngestResult = { slug: string; status: "written" | "unchanged" | "rejected" | "error" | "no-series"; value?: number; previous?: number; message?: string; draftArticleId?: string | null };

const today = () => new Date().toISOString().slice(0, 10);

/** Every series a source can fill; the rest are entered by hand (CPI, solar, and SBP's when its site blocks us). */
export const AUTO_SERIES = ["usd-pkr", "aed-pkr", "sar-pkr", "gbp-pkr", "eur-pkr", "kibor-1y", "sbp-policy-rate", "petrol-price", "diesel-price", "gold-24k-tola", "gold-22k-tola", "gold-21k-tola", "silver-tola", "kse-100", "btc-usd", "eth-usd"] as const;

/** Series whose change is news: a draft article is created for the desk to check and publish. */
const NEWSWORTHY: Record<string, { title: (v: number, prev: number) => string; body: (v: number, prev: number, note: string) => string; category: string; tool?: string }> = {
  "petrol-price": {
    category: "economy",
    tool: "/tools/cars/fuel-cost-calculator",
    title: (v, p) => `Petrol price ${v > p ? "raised" : "cut"} to Rs ${v.toFixed(2)} per litre, ${v > p ? "up" : "down"} Rs ${Math.abs(v - p).toFixed(2)}`,
    body: (v, p, note) => `The ex-depot price of petrol (Premier Euro 5) is now **Rs ${v.toFixed(2)} per litre**, ${v > p ? "up" : "down"} from Rs ${p.toFixed(2)}, a change of Rs ${Math.abs(v - p).toFixed(2)} (${(((v - p) / p) * 100).toFixed(1)}%).

Source: ${note}.

## What it means

- Filling a 35-litre tank now costs **Rs ${(v * 35).toFixed(0)}**, ${v > p ? "Rs " + ((v - p) * 35).toFixed(0) + " more" : "Rs " + ((p - v) * 35).toFixed(0) + " less"} than before.
- A car doing 1,000 km a month at 12 km/l spends about **Rs ${((1000 / 12) * v).toFixed(0)}** on petrol.
- Check your own numbers with the [Fuel Cost Calculator](/tools/cars/fuel-cost-calculator) and see the [petrol price history](/data/petrol-price).

*Draft generated automatically from the data hub, verify against the OGRA notification before publishing.*`,
  },
  "diesel-price": {
    category: "economy",
    title: (v, p) => `Diesel price ${v > p ? "raised" : "cut"} to Rs ${v.toFixed(2)} per litre`,
    body: (v, p, note) => `High-speed diesel is now **Rs ${v.toFixed(2)} per litre**, ${v > p ? "up" : "down"} from Rs ${p.toFixed(2)} (${(((v - p) / p) * 100).toFixed(1)}%). Source: ${note}.

Diesel moves transport and food prices: expect goods-transport rates to follow within days. History: [diesel price](/data/diesel-price).

*Draft generated automatically from the data hub, verify against the OGRA notification before publishing.*`,
  },
  "sbp-policy-rate": {
    category: "economy",
    tool: "/tools/cars/car-loan-calculator",
    title: (v, p) => `SBP ${v > p ? "raises" : "cuts"} policy rate to ${v}%`,
    body: (v, p, note) => `The State Bank of Pakistan's policy rate is now **${v}%**, ${v > p ? "up" : "down"} from ${p}%. Source: ${note}.

## What it means for you

- Bank lending rates (KIBOR + spread) follow within weeks: car and home loan instalments ${v > p ? "rise" : "fall"}.
- Savings-account and NSC profit rates move the same way.
- Model a loan at the new rate with the [Car Loan Calculator](/tools/cars/car-loan-calculator) or [Home Loan Calculator](/tools/finance/home-loan-calculator).

*Draft generated automatically from the data hub, verify against the SBP monetary policy statement before publishing.*`,
  },
};

/** Create a draft news article for a newsworthy change, unless one already exists for this series today. */
async function draftArticle(slug: string, value: number, previous: number, note: string) {
  const tpl = NEWSWORTHY[slug];
  if (!tpl || value === previous) return null;
  const db = await getDb();
  const date = today();
  const artSlug = `${slug}-${date}`;
  const exists = await db.query.articles.findFirst({ where: and(eq(schema.articles.kind, "news"), eq(schema.articles.slug, artSlug)), columns: { id: true } });
  if (exists) return exists.id;
  const [category, author] = await Promise.all([
    db.query.categories.findFirst({ where: and(eq(schema.categories.kind, "news"), eq(schema.categories.slug, tpl.category)), columns: { id: true } }),
    db.query.authors.findFirst({ where: eq(schema.authors.slug, "searchable-editorial"), columns: { id: true } }),
  ]);
  const body = tpl.body(value, previous, note);
  const [row] = await db
    .insert(schema.articles)
    .values({ kind: "news", status: "draft", slug: artSlug, title: tpl.title(value, previous), dek: `Automatically drafted from the data hub on ${date}; needs an editor's check before publishing.`, body, excerpt: body.slice(0, 180), categoryId: category?.id ?? null, authorId: author?.id ?? null, sources: [{ title: note, url: "" }], faqs: [], relatedIds: [] })
    .returning({ id: schema.articles.id });
  return row.id;
}
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
    if (s.usd) readings.push({ slug: "usd-pkr", value: s.usd, date, note: `M2M revaluation rate, ${note}`, sourceUrl: url });
    if (s.kibor12) readings.push({ slug: "kibor-1y", value: s.kibor12, date, note: `12-month KIBOR offer, ${note}`, sourceUrl: url });
    if (s.policy) readings.push({ slug: "sbp-policy-rate", value: s.policy, date, note: `Policy rate, ${note}`, sourceUrl: url });
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
    readings.push({ slug: "gold-21k-tola", value: Math.round(tola24 * (21 / 24)), date, note: "21/24 of the 24K reading (auto)", sourceUrl: "https://gold-api.com" });
    readings.push({ slug: "silver-tola", value: Math.round(xag * TOLA_PER_OZ * fx), date, note: `Spot $${xag.toFixed(2)}/oz × Rs ${fx.toFixed(2)} (auto)`, sourceUrl: "https://gold-api.com" });
  } catch (e) {
    errors.push(`Gold: ${(e as Error).message}`);
  }

  try {
    const t = strip(await text("https://dps.psx.com.pk/indices"));
    const kse = t.match(/KSE100\s+([\d,]+\.\d+)/)?.[1];
    if (kse) readings.push({ slug: "kse-100", value: Number(kse.replace(/,/g, "")), date, note: "PSX data portal, KSE-100 (auto)", sourceUrl: "https://dps.psx.com.pk/indices" });
    else errors.push("PSX: KSE100 not found on page");
  } catch (e) {
    errors.push(`PSX: ${(e as Error).message}`);
  }

  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd", { headers: { "user-agent": UA }, cache: "no-store" });
    if (!res.ok) throw new Error(`coingecko → ${res.status}`);
    const d = (await res.json()) as { bitcoin?: { usd: number }; ethereum?: { usd: number } };
    if (d.bitcoin?.usd) readings.push({ slug: "btc-usd", value: d.bitcoin.usd, date, note: "CoinGecko spot (auto)", sourceUrl: "https://www.coingecko.com/en/coins/bitcoin" });
    if (d.ethereum?.usd) readings.push({ slug: "eth-usd", value: d.ethereum.usd, date, note: "CoinGecko spot (auto)", sourceUrl: "https://www.coingecko.com/en/coins/ethereum" });
  } catch (e) {
    errors.push(`Crypto: ${(e as Error).message}`);
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
      results.push({ slug: r.slug, status: "rejected", value: r.value, previous: prev.value, message: `Moved ${Math.round((Math.abs(r.value - prev.value) / Math.abs(prev.value)) * 100)}% from last reading, review and force if genuine` });
      continue;
    }
    try {
      await addDataPoint(series.id, r.date, r.value, r.note, r.sourceUrl);
      await indexDataSeries(series.id);
      const draftArticleId = prev && prev.value !== r.value ? await draftArticle(r.slug, r.value, prev.value, r.note) : null;
      results.push({ slug: r.slug, status: "written", value: r.value, previous: prev?.value, draftArticleId });
    } catch (e) {
      results.push({ slug: r.slug, status: "error", message: (e as Error).message });
    }
  }
  const at = new Date().toISOString();
  await db.insert(schema.settings).values({ key: "ingest:last", value: { at, results, errors } }).onConflictDoUpdate({ target: schema.settings.key, set: { value: { at, results, errors }, updatedAt: new Date() } });
  return { results, errors, at };
}
