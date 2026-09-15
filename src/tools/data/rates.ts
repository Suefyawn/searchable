/**
 * Miscellaneous rate tables used by the launch tools. Each block carries its source and review date.
 * These are INDICATIVE reference values for the prototype — verify each against the primary source
 * before go-live (tracked in docs/ROADMAP-1000-DAYS.md, Phase 3 "versioned rate tables").
 */

// ── PTA / FBR mobile device tax (DIRBS registration) ────────────────────────
// Fixed-amount slabs by declared value in USD. The higher slabs also carry sales tax on value.
export type PtaSlab = { maxUsd: number | null; fixedPkr: number; pctOfValue: number };

export const PTA_MOBILE_TAX = {
  reviewedAt: "2026-09-15",
  source: { title: "FBR — Mobile device duty & tax schedule (DIRBS)", url: "https://dirbs.pta.gov.pk/", publisher: "PTA / FBR" },
  /** Registered on a passport within 60 days of arrival. */
  passport: [
    { maxUsd: 30, fixedPkr: 1_230, pctOfValue: 0 },
    { maxUsd: 100, fixedPkr: 6_400, pctOfValue: 0 },
    { maxUsd: 200, fixedPkr: 17_280, pctOfValue: 0 },
    { maxUsd: 350, fixedPkr: 23_800, pctOfValue: 0.17 },
    { maxUsd: 500, fixedPkr: 34_000, pctOfValue: 0.17 },
    { maxUsd: null, fixedPkr: 52_000, pctOfValue: 0.17 },
  ] as PtaSlab[],
  /** Registered on a CNIC. */
  cnic: [
    { maxUsd: 30, fixedPkr: 1_430, pctOfValue: 0 },
    { maxUsd: 100, fixedPkr: 7_843, pctOfValue: 0 },
    { maxUsd: 200, fixedPkr: 20_031, pctOfValue: 0 },
    { maxUsd: 350, fixedPkr: 24_770, pctOfValue: 0.17 },
    { maxUsd: 500, fixedPkr: 39_000, pctOfValue: 0.17 },
    { maxUsd: null, fixedPkr: 63_500, pctOfValue: 0.17 },
  ] as PtaSlab[],
};

// ── Reference market rates (Phase 6 replaces these with the data platform) ──
export const REFERENCE_RATES = {
  reviewedAt: "2026-09-15",
  // Fallbacks only — live values come from the data hub (src/lib/ingest.ts) at render time.
  usdPkr: 277.3,
  goldPerTola24k: 446_000,
  goldPerGram24k: 38_240,
  silverPerGram: 563,
  kibor1y: 12.3,
};

// ── Zakat ───────────────────────────────────────────────────────────────────
export const ZAKAT = {
  rate: 0.025,
  nisabGoldGrams: 87.48,
  nisabSilverGrams: 612.36,
  source: { title: "Zakat & Ushr Ordinance 1980; classical nisab (7.5 tola gold / 52.5 tola silver)", publisher: "Ministry of Religious Affairs" },
};

// ── Residential electricity tariff (NEPRA uniform tariff, DISCOs e.g. LESCO/IESCO/K-Electric) ──
export type TariffSlab = { from: number; to: number | null; rate: number };

export const ELECTRICITY = {
  reviewedAt: "2026-09-15",
  source: { title: "NEPRA — Schedule of Electricity Tariffs for residential consumers", url: "https://nepra.org.pk/", publisher: "NEPRA" },
  /** Unprotected residential (A-1), consumption-based slabs. Rs per kWh. */
  unprotected: [
    { from: 1, to: 100, rate: 23.59 },
    { from: 101, to: 200, rate: 30.07 },
    { from: 201, to: 300, rate: 34.26 },
    { from: 301, to: 400, rate: 39.15 },
    { from: 401, to: 500, rate: 41.36 },
    { from: 501, to: 600, rate: 42.78 },
    { from: 601, to: 700, rate: 43.92 },
    { from: 701, to: null, rate: 48.84 },
  ] as TariffSlab[],
  /** Protected residential (≤ 200 units for 6 consecutive months). */
  protected: [
    { from: 1, to: 50, rate: 3.95 },
    { from: 51, to: 100, rate: 7.74 },
    { from: 101, to: 200, rate: 10.54 },
  ] as TariffSlab[],
  /** Adders applied on top of energy charge. */
  gstRate: 0.17,
  electricityDutyRate: 0.015,
  fcSurchargePerUnit: 3.23,
  tvLicenseFee: 35,
  /** Fuel price adjustment varies monthly; default 0, user can override. */
  defaultFpaPerUnit: 0,
};

// ── Labour ──────────────────────────────────────────────────────────────────
export const LABOUR = {
  reviewedAt: "2026-09-15",
  minimumWage: 37_000,
  /** EOBI: employee 1% of minimum wage; employer 5%. */
  eobiEmployeeRate: 0.01,
  eobiEmployerRate: 0.05,
  source: { title: "EOBI contribution rates; Federal minimum wage notification", publisher: "EOBI / Ministry of Finance" },
};
