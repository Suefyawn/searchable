/**
 * Rates for the payroll, telecom and banking calculators. Each block names its source and the date it was
 * last checked; change the numbers here, never inside a calculator.
 */

export const IT_EXPORT_TAX = {
  reviewedAt: "2026-09-15",
  effectiveFrom: "2025-07-01",
  /** Section 154A final tax on IT and IT-enabled export proceeds, PSEB-registered exporters. */
  ratePseb: 0.0025,
  /** Without PSEB registration. */
  rateNonPseb: 0.01,
  /** Concession runs to the end of tax year 2029 (Finance Act 2026 extended it). */
  validUntil: "2029-06-30",
  /** Share of proceeds that must come through approved banking channels to keep the final-tax status. */
  bankingChannelShare: 0.8,
  source: { title: "Income Tax Ordinance 2001, s.154A (as amended by Finance Acts 2025 and 2026)", publisher: "FBR", url: "https://www.fbr.gov.pk" },
};

export const GRATUITY = {
  reviewedAt: "2026-09-15",
  effectiveFrom: "1968-01-01",
  /** Days of last-drawn wages per completed year of service. */
  daysPerYear: 30,
  /** Service of six months or more in the final year counts as a full year. */
  roundUpMonths: 6,
  /** Minimum service before gratuity is due (months). */
  minServiceMonths: 12,
  source: { title: "Industrial and Commercial Employment (Standing Orders) Ordinance 1968, Standing Order 12(6); Sindh Terms of Employment (Standing Orders) Act 2015", publisher: "Provincial labour departments" },
};

export const OVERTIME = {
  reviewedAt: "2026-09-15",
  effectiveFrom: "1934-01-01",
  /** Overtime is paid at twice the ordinary rate. */
  multiplier: 2,
  /** Ordinary hours: 48 a week, 9 a day (8 in a 6-day week with a rest interval). */
  weeklyHours: 48,
  dailyHours: 9,
  /** Monthly wages are converted to hourly on 26 working days. */
  daysPerMonth: 26,
  source: { title: "Factories Act 1934, ss.34, 36 and 47; Shops and Establishments Ordinance 1969", publisher: "Provincial labour departments" },
};

export const MOBILE_LOAD_TAX = {
  reviewedAt: "2026-09-15",
  effectiveFrom: "2024-07-01",
  /** Advance income tax on prepaid recharge, s.236(1)(a), applied on the amount you receive. */
  advanceTax: 0.15,
  /** Sales tax on telecom services, charged when the balance is used (provincial; 19.5% in the four provinces). */
  salesTaxOnUse: 0.195,
  /** Islamabad Capital Territory charges federal excise on telecom instead. */
  salesTaxIct: 0.185,
  source: { title: "Income Tax Ordinance 2001, s.236 and Division V of Part IV of the First Schedule; provincial sales tax on services acts", publisher: "FBR and provincial revenue authorities" },
};

export const CASH_WITHDRAWAL_TAX = {
  reviewedAt: "2026-09-15",
  effectiveFrom: "2025-07-01",
  /** Section 231AB: non-filers only, once cash withdrawn in a day passes the threshold. */
  rateNonFiler: 0.008,
  dailyThreshold: 50_000,
  source: { title: "Income Tax Ordinance 2001, s.231AB (rate raised from 0.6% to 0.8% by Finance Act 2025)", publisher: "FBR", url: "https://www.fbr.gov.pk" },
};
