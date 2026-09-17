/**
 * Government fee schedules. Verified 2026-09-18 against the charts the departments publish.
 *
 * PASSPORT: DGIP's "Enhanced passport fee" chart (dgip.gov.pk/assets/img/MRP-Fee-Chart-2024.jpg) and the
 * Fast Track schedule of May 2024 (dgip.gov.pk/assets/img/FastTrackFeeStructure-5-24.jpg). A lost passport
 * costs double the first time, four times the second and eight times the third; fast track is not offered
 * for lost passports on the chart.
 * VEHICLE TRANSFER (PUNJAB): "Rates of Transfer Fee" on excise.punjab.gov.pk/motorvehicle_tax.
 */

export type PassportPages = 36 | 72 | 100;
export type PassportYears = 5 | 10;

export const PASSPORT_FEES = {
  reviewedAt: "2026-09-18",
  source: { title: "DGIP: Enhanced passport fee chart (2024) and Fast Track fee schedule (May 2024)", url: "https://dgip.gov.pk/", publisher: "Directorate General of Immigration & Passports" },
  /** Rs, ordinary passport, first issue or renewal: [normal, urgent]. */
  base: {
    36: { 5: [4_500, 7_500], 10: [6_700, 11_200] },
    72: { 5: [8_200, 13_500], 10: [12_400, 20_200] },
    100: { 5: [9_000, 18_000], 10: [13_500, 27_000] },
  } as Record<PassportPages, Record<PassportYears, [number, number]>>,
  /** Rs, delivered within 48 hours (two working days). */
  fastTrack: {
    36: { 5: 12_500, 10: 16_200 },
    72: { 5: 18_500, 10: 25_200 },
    100: { 5: 23_000, 10: 32_000 },
  } as Record<PassportPages, Record<PassportYears, number>>,
  /** Multiplier on the normal or urgent fee: first issue or renewal, 1st loss, 2nd loss, 3rd loss. */
  lostMultiplier: [1, 2, 4, 8],
  /** DGIP's stated processing times; deliveries ran longer in 2024 when lamination paper was short. */
  delivery: { normal: "about 10 working days", urgent: "about 4 working days", fastTrack: "within 2 working days (48 hours)" },
};

export const VEHICLE_TRANSFER_PUNJAB = {
  reviewedAt: "2026-09-18",
  source: { title: "Excise, Taxation & Narcotics Control Department Punjab: Rates of Transfer Fee", url: "https://excise.punjab.gov.pk/motorvehicle_tax", publisher: "Government of the Punjab" },
  fee: {
    motorcycle: { label: "Motorcycle or scooter", amount: 910 },
    upTo1000: { label: "Car up to 1000cc", amount: 4_540 },
    upTo1800: { label: "Car 1001cc to 1800cc", amount: 9_075 },
    above1800: { label: "Car above 1800cc", amount: 18_150 },
    htv: { label: "Heavy transport vehicle", amount: 9_075 },
  },
  /** Data-embedded smart registration card issued on transfer. */
  smartCard: 1_300,
  /** Capital value tax on transfer of a motor vehicle, 1% of the assessed value (Punjab Finance Act 2022, from 1 July 2022). */
  cvtRate: 0.01,
};
