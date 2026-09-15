/**
 * Motor vehicle (token) tax schedules. Verified 2026-09-15.
 *
 * PUNJAB — official table at https://excise.punjab.gov.pk/motorvehicle_tax ("Rates of Token tax, Income Tax,
 * Professional Tax for Motor Car", columns 2026-27 / 2025-26 / 2023-24), parsed directly.
 * ISLAMABAD — Finance Act 2026-27 amendments to the West Pakistan Motor Vehicles Taxation Act as reported by
 * The News (thenews.pk/print/1420345) and consistent across independent calculators; effective 1 July 2026.
 * SINDH / KP / BALOCHISTAN — annual rates for cars above 1000cc are not published on the official portals in a
 * verifiable form; deliberately omitted until confirmed.
 */

export type Province = "punjab" | "islamabad";

export type TokenSchedule = {
  name: string;
  fiscalYear: string;
  source: { title: string; url: string; publisher: string };
  /** One-time lifetime token for cars ≤ 1000cc (annual token is nil thereafter). */
  lifetimeUpTo1000: number;
  /** One-time lifetime token for motorcycles. */
  motorcycleLifetime: number;
  /** Annual token as a fraction of invoice value, by engine band (min exclusive, max inclusive). */
  annualPct: { minCc: number; maxCc: number | null; pct: number }[];
  /** Provincial professional tax collected with token (per year). */
  professionalTax: number;
  /** Rebate on annual token if the whole year is paid by 31 August. */
  earlyRebate: number;
};

export const SCHEDULES: Record<Province, TokenSchedule> = {
  punjab: {
    name: "Punjab",
    fiscalYear: "2026-27",
    source: { title: "Rates of Token Tax, Income Tax, Professional Tax for Motor Car (2026-27)", url: "https://excise.punjab.gov.pk/motorvehicle_tax", publisher: "Excise, Taxation & Narcotics Control Department, Punjab" },
    lifetimeUpTo1000: 20_000,
    motorcycleLifetime: 1_500,
    annualPct: [
      { minCc: 1000, maxCc: 2000, pct: 0.003 },
      { minCc: 2000, maxCc: null, pct: 0.004 },
    ],
    professionalTax: 200,
    earlyRebate: 0.1,
  },
  islamabad: {
    name: "Islamabad (ICT)",
    fiscalYear: "2026-27",
    source: { title: "Finance Act 2026-27 — token tax on motor vehicles in ICT", url: "https://www.thenews.pk/print/1420345-token-tax-on-motor-vehicles-in-ict-raised", publisher: "Excise & Taxation Office, Islamabad Capital Territory" },
    lifetimeUpTo1000: 20_000,
    motorcycleLifetime: 1_500,
    annualPct: [
      { minCc: 1000, maxCc: 2000, pct: 0.0025 },
      { minCc: 2000, maxCc: null, pct: 0.0035 },
    ],
    professionalTax: 0,
    earlyRebate: 0,
  },
};

/**
 * Federal income tax collected with token tax under section 234, Income Tax Ordinance 2001 (Division III, Part IV,
 * First Schedule). Non-filer rate is 300% of the filer rate. For cars ≤ 1000cc paying lifetime token, a one-time
 * lump sum applies instead of an annual amount. Figures as shown on the Punjab Excise table (2026-27).
 */
export const INCOME_TAX_234 = {
  lumpSumUpTo1000: { filer: 10_000, nonFiler: 30_000 },
  annual: [
    { minCc: 1000, maxCc: 1199, filer: 1_500, nonFiler: 4_500 },
    { minCc: 1199, maxCc: 1299, filer: 1_750, nonFiler: 5_250 },
    { minCc: 1299, maxCc: 1499, filer: 2_500, nonFiler: 7_500 },
    { minCc: 1499, maxCc: 1599, filer: 3_750, nonFiler: 11_250 },
    { minCc: 1599, maxCc: 1999, filer: 4_500, nonFiler: 13_500 },
    { minCc: 1999, maxCc: null, filer: 10_000, nonFiler: 30_000 },
  ],
};

export function annualPctFor(schedule: TokenSchedule, cc: number): number {
  const band = schedule.annualPct.find((b) => cc > b.minCc && (b.maxCc === null || cc <= b.maxCc));
  return band?.pct ?? 0;
}

export function incomeTax234(cc: number, filer: boolean): number {
  const band = INCOME_TAX_234.annual.find((b) => cc > b.minCc && (b.maxCc === null || cc <= b.maxCc));
  if (!band) return 0;
  return filer ? band.filer : band.nonFiler;
}
