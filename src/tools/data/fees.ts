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

export type NadraService = "new" | "modification" | "duplicate" | "renewal";
export type NadraDocument = "cnic" | "smartNic" | "crc" | "frcOne" | "frcBoth" | "nicopA" | "nicopB" | "poc";
type NadraDoc = { label: string; currency: "PKR" | "USD"; /** [normal, urgent, executive]; null where the category is not offered. */ services: Partial<Record<NadraService, [number | null, number | null, number | null]>>; days: [number | null, number | null, number | null] };

/**
 * NADRA fee structure (nadra.gov.pk/feeStructure, site last updated 17-09-2026, read 2026-09-18). PKR for
 * inland documents; NICOP and POC in USD, paid in rupees at NADRA's conversion rate on the application date.
 */
export const NADRA_FEES = {
  reviewedAt: "2026-09-18",
  source: { title: "NADRA: Fee Structure, processing fee and timeline for CNIC, Smart CNIC, CRC, FRC, NICOP and POC", url: "https://www.nadra.gov.pk/feeStructure", publisher: "National Database & Registration Authority" },
  /** Home delivery of a card within Pakistan. */
  deliveryPk: 165,
  documents: {
    cnic: { label: "CNIC (paper)", currency: "PKR", services: { new: [0, 1_150, 2_150], modification: [400, 1_150, 2_150], duplicate: [400, 1_150, 2_150], renewal: [400, 1_150, 2_150] }, days: [15, 12, 6] },
    smartNic: { label: "Smart NIC", currency: "PKR", services: { new: [750, 1_500, 2_500], modification: [750, 1_500, 2_500], duplicate: [750, 1_500, 2_500], renewal: [750, 1_500, 2_500] }, days: [31, 23, 9] },
    crc: { label: "CRC / B-form (child registration)", currency: "PKR", services: { new: [50, null, 500] }, days: [7, null, 1] },
    frcOne: { label: "FRC: one family type (alpha, beta or gamma)", currency: "PKR", services: { new: [null, null, 1_000] }, days: [null, null, 1] },
    frcBoth: { label: "FRC: both family types", currency: "PKR", services: { new: [null, null, 2_000] }, days: [null, null, 1] },
    nicopA: { label: "Smart NICOP, Zone A (USA, Europe)", currency: "USD", services: { new: [39, 57, 75], modification: [39, 57, 75], duplicate: [39, 57, 75], renewal: [39, 57, 75] }, days: [31, 23, 9] },
    nicopB: { label: "Smart NICOP, Zone B (Middle East, Africa)", currency: "USD", services: { new: [20, 30, 40], modification: [20, 30, 40], duplicate: [20, 30, 140], renewal: [20, 30, 40] }, days: [31, 23, 9] },
    poc: { label: "Smart POC (Pakistan Origin Card)", currency: "USD", services: { new: [150, 200, 250], modification: [200, 250, 300], duplicate: [200, 250, 300], renewal: [150, 200, 250] }, days: [31, 23, 9] },
  } as Record<NadraDocument, NadraDoc>,
};
