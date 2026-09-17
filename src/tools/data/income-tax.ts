/**
 * Income tax slabs for individuals, Income Tax Ordinance 2001, First Schedule, Part I.
 * Rates live here (not in calculators) so a Finance Act change is a data edit + review date bump.
 *
 * REVIEW EVERY BUDGET (June). Verify against the Finance Act text and FBR's published slab table.
 */

export type Slab = { upTo: number | null; rate: number; fixed: number; over: number };

export type TaxYear = {
  year: string;
  label: string;
  effectiveFrom: string;
  source: { title: string; url: string; publisher: string };
  salaried: Slab[];
  nonSalaried: Slab[];
  /** Surcharge on tax where taxable income exceeds `surchargeThreshold`. */
  surchargeThreshold: number;
  surchargeRateSalaried: number;
  surchargeRateNonSalaried: number;
};

export const TAX_YEARS: TaxYear[] = [
  {
    year: "2026-27",
    label: "Tax Year 2027 (FY 2026-27)",
    effectiveFrom: "2026-07-01",
    source: {
      title: "Finance Act 2026 (Gazette of Pakistan, 26 June 2026): First Schedule, Part I, Division I (salaried slabs; s.4AB surcharge withdrawn for salaried)",
      url: "https://download1.fbr.gov.pk/Docs/20266291261044366FinanceAct2026.pdf",
      publisher: "Federal Board of Revenue",
    },
    salaried: [
      { upTo: 600_000, rate: 0, fixed: 0, over: 0 },
      { upTo: 1_200_000, rate: 0.01, fixed: 0, over: 600_000 },
      { upTo: 2_200_000, rate: 0.11, fixed: 6_000, over: 1_200_000 },
      { upTo: 3_200_000, rate: 0.2, fixed: 116_000, over: 2_200_000 },
      { upTo: 4_100_000, rate: 0.25, fixed: 316_000, over: 3_200_000 },
      { upTo: 5_600_000, rate: 0.29, fixed: 541_000, over: 4_100_000 },
      { upTo: 7_000_000, rate: 0.32, fixed: 976_000, over: 5_600_000 },
      { upTo: null, rate: 0.35, fixed: 1_424_000, over: 7_000_000 },
    ],
    nonSalaried: [
      { upTo: 600_000, rate: 0, fixed: 0, over: 0 },
      { upTo: 1_200_000, rate: 0.15, fixed: 0, over: 600_000 },
      { upTo: 1_600_000, rate: 0.2, fixed: 90_000, over: 1_200_000 },
      { upTo: 3_200_000, rate: 0.3, fixed: 170_000, over: 1_600_000 },
      { upTo: 5_600_000, rate: 0.4, fixed: 650_000, over: 3_200_000 },
      { upTo: null, rate: 0.45, fixed: 1_610_000, over: 5_600_000 },
    ],
    surchargeThreshold: 10_000_000,
    surchargeRateSalaried: 0,
    surchargeRateNonSalaried: 0.1,
  },
  {
    year: "2025-26",
    label: "Tax Year 2026 (FY 2025-26)",
    effectiveFrom: "2025-07-01",
    source: {
      title: "Finance Act 2025: First Schedule, Part I, Division I",
      url: "https://fbr.gov.pk/",
      publisher: "Federal Board of Revenue",
    },
    salaried: [
      { upTo: 600_000, rate: 0, fixed: 0, over: 0 },
      { upTo: 1_200_000, rate: 0.01, fixed: 0, over: 600_000 },
      { upTo: 2_200_000, rate: 0.11, fixed: 6_000, over: 1_200_000 },
      { upTo: 3_200_000, rate: 0.23, fixed: 116_000, over: 2_200_000 },
      { upTo: 4_100_000, rate: 0.3, fixed: 346_000, over: 3_200_000 },
      { upTo: null, rate: 0.35, fixed: 616_000, over: 4_100_000 },
    ],
    nonSalaried: [
      { upTo: 600_000, rate: 0, fixed: 0, over: 0 },
      { upTo: 1_200_000, rate: 0.15, fixed: 0, over: 600_000 },
      { upTo: 1_600_000, rate: 0.2, fixed: 90_000, over: 1_200_000 },
      { upTo: 3_200_000, rate: 0.3, fixed: 170_000, over: 1_600_000 },
      { upTo: 5_600_000, rate: 0.4, fixed: 650_000, over: 3_200_000 },
      { upTo: null, rate: 0.45, fixed: 1_610_000, over: 5_600_000 },
    ],
    surchargeThreshold: 10_000_000,
    surchargeRateSalaried: 0.09,
    surchargeRateNonSalaried: 0.1,
  },
  {
    year: "2024-25",
    label: "Tax Year 2025 (FY 2024-25)",
    effectiveFrom: "2024-07-01",
    source: {
      title: "Finance Act 2024: First Schedule, Part I, Division I",
      url: "https://fbr.gov.pk/",
      publisher: "Federal Board of Revenue",
    },
    salaried: [
      { upTo: 600_000, rate: 0, fixed: 0, over: 0 },
      { upTo: 1_200_000, rate: 0.05, fixed: 0, over: 600_000 },
      { upTo: 2_200_000, rate: 0.15, fixed: 30_000, over: 1_200_000 },
      { upTo: 3_200_000, rate: 0.25, fixed: 180_000, over: 2_200_000 },
      { upTo: 4_100_000, rate: 0.3, fixed: 430_000, over: 3_200_000 },
      { upTo: null, rate: 0.35, fixed: 700_000, over: 4_100_000 },
    ],
    nonSalaried: [
      { upTo: 600_000, rate: 0, fixed: 0, over: 0 },
      { upTo: 1_200_000, rate: 0.15, fixed: 0, over: 600_000 },
      { upTo: 1_600_000, rate: 0.2, fixed: 90_000, over: 1_200_000 },
      { upTo: 3_200_000, rate: 0.3, fixed: 170_000, over: 1_600_000 },
      { upTo: 5_600_000, rate: 0.4, fixed: 650_000, over: 3_200_000 },
      { upTo: null, rate: 0.45, fixed: 1_610_000, over: 5_600_000 },
    ],
    surchargeThreshold: 10_000_000,
    surchargeRateSalaried: 0.1,
    surchargeRateNonSalaried: 0.1,
  },
];

export const CURRENT_TAX_YEAR = TAX_YEARS[0];
/** When the slabs above were last checked against the Finance Act; every calculator on this table shows it. */
export const INCOME_TAX_REVIEWED_AT = "2026-09-15";

export function getTaxYear(year: string): TaxYear {
  return TAX_YEARS.find((t) => t.year === year) ?? CURRENT_TAX_YEAR;
}

export type TaxBreakdown = {
  taxableIncome: number;
  baseTax: number;
  surcharge: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
  slab: Slab;
};

export function computeIncomeTax(taxableIncome: number, year: TaxYear, kind: "salaried" | "nonSalaried"): TaxBreakdown {
  const slabs = year[kind];
  const income = Math.max(0, Math.floor(taxableIncome));
  const slab = slabs.find((s) => s.upTo === null || income <= s.upTo) ?? slabs[slabs.length - 1];
  const baseTax = slab.fixed + (income - slab.over) * slab.rate;
  const surchargeRate = kind === "salaried" ? year.surchargeRateSalaried : year.surchargeRateNonSalaried;
  const surcharge = income > year.surchargeThreshold ? baseTax * surchargeRate : 0;
  const totalTax = Math.round(baseTax + surcharge);
  return {
    taxableIncome: income,
    baseTax: Math.round(baseTax),
    surcharge: Math.round(surcharge),
    totalTax,
    effectiveRate: income > 0 ? totalTax / income : 0,
    marginalRate: slab.rate,
    slab,
  };
}
