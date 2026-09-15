/**
 * Domestic gas tariff (SNGPL / SSGC) and National Savings profit rates. Verified 2026-09-15.
 */

/**
 * OGRA domestic gas tariff, effective 1 July 2025 (notification 29 June 2025) and left unchanged by the July 2026
 * review (government kept consumer tariffs flat despite the lower prescribed price). Slabs are monthly consumption
 * in hm³ (1 hm³ = 100 m³); the whole consumption is billed at the slab rate it falls in.
 */
export const GAS_TARIFF = {
  reviewedAt: "2026-09-15",
  effectiveFrom: "2025-07-01",
  source: { title: "OGRA — Notified consumer gas prices for SNGPL and SSGC (29 June 2025; unchanged July 2026)", url: "https://ogra.org.pk/", publisher: "Oil & Gas Regulatory Authority" },
  /** MMBTU per m³ at the typical gross calorific value billed by SNGPL/SSGC (~ 950–1000 BTU/scf). */
  mmbtuPerM3: 0.0355,
  gst: 0.18,
  meterRent: 40,
  /** Protected: consumed < 0.9 hm³ in each of the last four months. */
  protected: {
    fixedCharge: 600,
    slabs: [
      { maxHm3: 0.25, rate: 200 },
      { maxHm3: 0.5, rate: 250 },
      { maxHm3: 0.6, rate: 300 },
      { maxHm3: 0.9, rate: 350 },
    ],
  },
  nonProtected: {
    fixedChargeLow: 1_500, // ≤ 1.5 hm³
    fixedChargeHigh: 3_000, // > 1.5 hm³
    slabs: [
      { maxHm3: 0.25, rate: 500 },
      { maxHm3: 0.6, rate: 850 },
      { maxHm3: 1.0, rate: 1_250 },
      { maxHm3: 1.5, rate: 1_450 },
      { maxHm3: 2.0, rate: 1_900 },
      { maxHm3: 3.0, rate: 3_300 },
      { maxHm3: 4.0, rate: 3_800 },
      { maxHm3: null as number | null, rate: 4_200 },
    ],
  },
};

/**
 * National Savings (CDNS) profit rates effective 18 July 2026, as published on savings.gov.pk and reported by
 * Express Tribune / BOL. Withholding on profit under s.151: 15% for filers, 35% for non-filers; Behbood and
 * Pensioners' Benefit Account are exempt from withholding (profit is taxed at a reduced final rate for filers).
 */
export const NSC = {
  reviewedAt: "2026-09-15",
  effectiveFrom: "2026-07-18",
  source: { title: "Central Directorate of National Savings — latest profit rates (18 July 2026)", url: "https://savings.gov.pk/latest-profit-rates/", publisher: "National Savings" },
  withholding: { filer: 0.15, nonFiler: 0.35 },
  schemes: {
    ric: { name: "Regular Income Certificate", rate: 0.1152, payout: "monthly", term: "5 years", min: 50_000, whtExempt: false, who: "Anyone; profit paid monthly" },
    bsc: { name: "Behbood Savings Certificate", rate: 0.1296, payout: "monthly", term: "10 years", min: 5_000, max: 7_500_000, whtExempt: true, who: "Senior citizens (60+), widows, persons with disabilities; max Rs 75 lakh" },
    pba: { name: "Pensioners' Benefit Account", rate: 0.1296, payout: "monthly", term: "10 years", min: 10_000, max: 7_500_000, whtExempt: true, who: "Retired government employees; max Rs 75 lakh" },
    dsc: { name: "Defence Savings Certificate", rate: 0.1024, payout: "maturity", term: "10 years (compounding)", min: 500, whtExempt: false, who: "Anyone; profit accrues and compounds, paid at encashment" },
    ssc: { name: "Special Savings Certificate", rate: 0.112, payout: "half-yearly", term: "3 years", min: 500, whtExempt: false, who: "Anyone; 11.2% for the first five half-years, 12.6% for the sixth" },
    sa: { name: "Savings Account", rate: 0.1, payout: "half-yearly", term: "open", min: 100, whtExempt: false, who: "Anyone; withdraw any time" },
    stsc: { name: "Short Term Savings Certificate (1 year)", rate: 0.1117, payout: "maturity", term: "3 / 6 / 12 months (11.12% / 11.14% / 11.17%)", min: 10_000, whtExempt: false, who: "Anyone; parking money for under a year" },
    sisa: { name: "Sarwa Islamic Savings Account", rate: 0.111, payout: "monthly", term: "open", min: 100, whtExempt: false, who: "Shariah-compliant (mudarabah) account" },
  },
};
