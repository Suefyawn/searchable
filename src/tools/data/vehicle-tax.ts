/**
 * Taxes and fees at new-vehicle registration. Verified 2026-09-15.
 *
 * s.231B advance income tax (Income Tax Ordinance 2001, First Schedule Part IV Div VII), value-based since Finance Act
 * 2025; Finance Act 2026 left the vehicle bands unchanged (it amended only the property and remittance divisions).
 * Non-filers pay 3× the filer rate. Value = invoice price inclusive of duties and taxes (local), or customs value +
 * duty + FED + sales tax (imported).
 */
export const WHT_231B = {
  effectiveFrom: "2025-07-01",
  source: { title: "Income Tax Ordinance 2001, First Schedule, Part IV, Division VII (s.231B): Finance Act 2025, unchanged by Finance Act 2026", url: "https://www.fbr.gov.pk/", publisher: "Federal Board of Revenue" },
  nonFilerMultiple: 3,
  bands: [
    { maxCc: 850, pct: 0.005 },
    { maxCc: 1000, pct: 0.01 },
    { maxCc: 1300, pct: 0.015 },
    { maxCc: 1600, pct: 0.02 },
    { maxCc: 1800, pct: 0.03 },
    { maxCc: 2000, pct: 0.05 },
    { maxCc: 2500, pct: 0.07 },
    { maxCc: 3000, pct: 0.09 },
    { maxCc: null as number | null, pct: 0.12 },
  ],
};

export function wht231B(cc: number, value: number, filer: boolean): { pct: number; amount: number } {
  const band = WHT_231B.bands.find((b) => b.maxCc === null || cc <= b.maxCc) ?? WHT_231B.bands[WHT_231B.bands.length - 1];
  const pct = band.pct * (filer ? 1 : WHT_231B.nonFilerMultiple);
  return { pct, amount: Math.round(value * pct) };
}

/**
 * Provincial registration fee (Punjab Excise schedule, % of value by engine size) plus number-plate / smart-card
 * charges. Sindh and ICT schedules are similar in shape but differ in figures; the tool labels this block Punjab.
 */
export const REGISTRATION_FEE_PUNJAB = {
  source: { title: "Registration fee schedule: Motor Vehicle Registration", url: "https://excise.punjab.gov.pk/registration", publisher: "Excise, Taxation & Narcotics Control Department, Punjab" },
  bands: [
    { maxCc: 1000, pct: 0.01 },
    { maxCc: 2000, pct: 0.02 },
    { maxCc: null as number | null, pct: 0.04 },
  ],
  /** Number plate + smart card + processing, approximate. */
  plateAndCard: 4_500,
};

export function registrationFeePunjab(cc: number, value: number): number {
  const band = REGISTRATION_FEE_PUNJAB.bands.find((b) => b.maxCc === null || cc <= b.maxCc)!;
  return Math.round(value * band.pct);
}

/** Sales tax rates. Federal GST on goods (Sales Tax Act 1990); provincial sales tax on services by authority. */
export const SALES_TAX = {
  reviewedAt: "2026-09-15",
  source: { title: "Sales Tax Act 1990 s.3 (18%); PRA, SRB, KPRA, BRA and ICT services tax schedules", url: "https://www.fbr.gov.pk/", publisher: "FBR and provincial revenue authorities" },
  goods: 0.18,
  services: {
    punjab: { name: "Punjab (PRA)", rate: 0.16 },
    sindh: { name: "Sindh (SRB)", rate: 0.15 },
    kp: { name: "Khyber Pakhtunkhwa (KPRA)", rate: 0.15 },
    balochistan: { name: "Balochistan (BRA)", rate: 0.15 },
    ict: { name: "Islamabad (ICT)", rate: 0.15 },
  },
  /** Further tax on supplies to unregistered persons (s.3(1A)). */
  furtherTaxUnregistered: 0.04,
};

/** EOBI contributions, Employees' Old-Age Benefits Act 1976; rates are on the federal minimum wage, not actual salary. */
export const EOBI = {
  reviewedAt: "2026-09-15",
  source: { title: "EOBI contribution rates; federal minimum wage Rs 40,700 (Finance Act 2026, from 1 July 2026)", url: "https://www.eobi.gov.pk/", publisher: "EOBI / Ministry of Finance" },
  minimumWage: 40_700,
  employerRate: 0.05,
  employeeRate: 0.01,
  /** Registration threshold: employers with this many employees or more must register. */
  employeeThreshold: 5,
  retirementAge: { men: 60, women: 55 },
  minInsurableYears: 15,
};
