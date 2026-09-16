/**
 * Taxes on buying, selling and holding immovable property. Verified 2026-09-15.
 *
 * FEDERAL (Income Tax Ordinance 2001, as amended by Finance Act 2026, effective 1 July 2026):
 *  - s.236K advance tax on purchase: ATL 1.25% flat (was 1.5–2.5% by value band); non-ATL 10.5 / 14.5 / 18.5% by value.
 *  - s.236C advance tax on sale:     ATL 2.75% flat (was 4.5–5.5%);              non-ATL 11.5%.
 *  - "Late filer" category (Tenth Schedule rule 1A) omitted; s.7E deemed income omitted; 3% FED on sale gone since FA2025.
 *  - s.37(1A) capital gains: acquired on/after 1 Jul 2024 → 15% for ATL, Division I rates (min 15%) for non-ATL;
 *    acquired before 1 Jul 2024 → holding-period table (Division VIII as inserted by Finance Act 2022).
 *  Sources: Finance Act 2026 commentary (Mettis Global), FBR Withholding Rate Card TY2027, FBR circular on FA2024 s.37(1A).
 *
 * PROVINCIAL transfer charges are set by each province's Stamp Act schedule / Finance Act and by district; the figures here
 * are defaults the user can override. `verified` marks what we confirmed against a primary or official-press source.
 */

export const EFFECTIVE_FROM = "2026-07-01";
export const REVIEWED_AT = "2026-09-15";

export const FEDERAL_SOURCES = [
  { title: "Finance Act 2026: amendments to sections 236C, 236K, 37(1A) and omission of s.7E (commentary)", url: "https://mettisglobal.news/COMMENTARY-ON-FINANCE-ACT-202627-61483", publisher: "Mettis Global / Finance Act 2026", date: "2026-06-27" },
  { title: "Withholding Income Tax Rate Card: Tax Year 2027", url: "https://www.fbr.gov.pk/", publisher: "Federal Board of Revenue", date: "2026-07-01" },
  { title: "FBR circular: no holding period for properties acquired on or after 1 July 2024 (s.37(1A))", url: "https://www.brecorder.com/news/40315168/acquired-on-or-after-july-1-2024-no-holding-period-for-immovable-properties-fbr", publisher: "Business Recorder / FBR", date: "2024-07-15" },
];

/** s.236K, collected from the buyer on the fair market value (FBR valuation table or DC rate, whichever is higher). */
export const WHT_236K = {
  filer: 0.0125,
  nonFiler: [
    { upTo: 50_000_000, rate: 0.105 },
    { upTo: 100_000_000, rate: 0.145 },
    { upTo: null as number | null, rate: 0.185 },
  ],
  previousFiler: "1.5% up to Rs 50M, 2% to Rs 100M, 2.5% above (FY2025-26)",
};

/** s.236C, collected from the seller on the gross consideration. Adjustable against CGT for filers. */
export const WHT_236C = {
  filer: 0.0275,
  nonFiler: 0.115,
  previousFiler: "4.5% up to Rs 50M, 5% to Rs 100M, 5.5% above (FY2025-26)",
};

export function wht236K(value: number, filer: boolean): number {
  if (filer) return WHT_236K.filer;
  return (WHT_236K.nonFiler.find((b) => b.upTo === null || value <= b.upTo) ?? WHT_236K.nonFiler[2]).rate;
}

export function wht236C(filer: boolean): number {
  return filer ? WHT_236C.filer : WHT_236C.nonFiler;
}

export type PropertyKind = "plot" | "constructed" | "flat";

/** Division VIII rates for property acquired BEFORE 1 July 2024, by holding period (years, exclusive lower bound). */
export const CGT_PRE_2024: { maxYears: number | null; plot: number; constructed: number; flat: number }[] = [
  { maxYears: 1, plot: 0.15, constructed: 0.15, flat: 0.15 },
  { maxYears: 2, plot: 0.125, constructed: 0.1, flat: 0.075 },
  { maxYears: 3, plot: 0.1, constructed: 0.075, flat: 0 },
  { maxYears: 4, plot: 0.075, constructed: 0.05, flat: 0 },
  { maxYears: 5, plot: 0.05, constructed: 0, flat: 0 },
  { maxYears: 6, plot: 0.025, constructed: 0, flat: 0 },
  { maxYears: null, plot: 0, constructed: 0, flat: 0 },
];

/** Property acquired ON/AFTER 1 July 2024: flat rate for ATL sellers; non-ATL pay Division I slab rates but never less than this. */
export const CGT_POST_2024 = { filer: 0.15, nonFilerMinimum: 0.15 };

export function cgtRatePre2024(kind: PropertyKind, years: number): number {
  const band = CGT_PRE_2024.find((b) => b.maxYears === null || years <= b.maxYears) ?? CGT_PRE_2024[CGT_PRE_2024.length - 1];
  return band[kind];
}

export type ProvinceCharges = {
  name: string;
  /** Fractions of the assessed value (DC / FBR value). */
  stampDuty: number;
  registrationFee: number;
  /** Local-government / authority transfer levy (Punjab TMA tax, CDA transfer fee). */
  localTax: number;
  localTaxLabel: string;
  verified: string;
  sources: { title: string; url?: string; publisher: string; date?: string }[];
};

export const PROVINCES: Record<"punjab" | "sindh" | "islamabad", ProvinceCharges> = {
  punjab: {
    name: "Punjab",
    stampDuty: 0.01,
    registrationFee: 0.01,
    localTax: 0.01,
    localTaxLabel: "TMA / local government transfer tax",
    verified: "Stamp duty 1% (urban and rural) confirmed by the Stamp (Amendment) Ordinance 2026 of 10 April 2026. Registration fee 1% and TMA tax 1% are the long-standing Punjab schedule figures; some districts cap the registration fee.",
    sources: [
      { title: "The Punjab Gazette, 10 April 2026: Stamp (Amendment) Ordinance 2026 (VI of 2026), 1% stamp duty on conveyance in urban and rural areas", url: "https://punjabcode.punjab.gov.pk/uploads/articles/stamp-amendment-ordinance-2026-pdf.pdf", publisher: "Government of the Punjab", date: "2026-04-10" },
      { title: "e-Registration fee schedule", url: "https://punjab-zameen.gov.pk/", publisher: "Board of Revenue Punjab" },
    ],
  },
  sindh: {
    name: "Sindh",
    stampDuty: 0.02,
    registrationFee: 0.01,
    localTax: 0,
    localTaxLabel: "Local transfer levy",
    verified: "Stamp duty 2% and registration fee 1% are the commonly cited Sindh schedule figures (Sindh Stamp Act schedule; Sindh Finance Acts). Not yet confirmed against the 2026 schedule, edit if your sub-registrar quotes differently. Society/DHA/KDA transfer fees are extra.",
    sources: [{ title: "Automation of Stamps and Registration: Board of Revenue Sindh", url: "https://bor.sindh.gov.pk/automation-of-stamps-and-registration", publisher: "Board of Revenue Sindh" }],
  },
  islamabad: {
    name: "Islamabad (ICT)",
    stampDuty: 0.01,
    registrationFee: 0.01,
    localTax: 0.01,
    localTaxLabel: "CDA transfer fee (CDA sectors only)",
    verified: "Conveyance stamp duty 1% set by Finance Act 2025 (down from 4%), unchanged by Finance Act 2026. CDA transfer fee cut from 3% to 1% on 10 April 2026. Registration fee 1% per ICT sub-registrar schedule.",
    sources: [
      { title: "Finance Act 2025: Stamp Act 1899 Schedule I (ICT): conveyance duty 1%", url: "https://legalise.pk/stamp-duty/", publisher: "ICT Administration (reported)", date: "2025-07-01" },
      { title: "CDA property transfer fee reduced from 3% to 1%", url: "https://propertyai.pk/punjab-property-stamp-duty-1-percent-2026/", publisher: "Capital Development Authority (reported)", date: "2026-04-10" },
    ],
  },
};
