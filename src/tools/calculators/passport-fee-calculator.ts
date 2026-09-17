import { PASSPORT_FEES, type PassportPages, type PassportYears } from "../data/fees";
import { num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const passportFeeCalculator: ToolDefinition = {
  slug: "passport-fee-calculator",
  category: "government",
  name: "Passport Fee Calculator Pakistan 2026",
  seoTitle: "Passport Fee in Pakistan 2026: Normal, Urgent & Fast Track Fees for 36, 72 & 100 Pages (5 & 10 Years)",
  shortName: "Passport fee",
  description: "The exact passport fee in Pakistan for every option: 36, 72 or 100 pages, 5 or 10 years, normal, urgent or fast track, and what a lost passport costs, with DGIP's delivery times.",
  keywords: ["passport fee", "passport fee pakistan", "passport fee in pakistan 2026", "urgent passport fee", "fast track passport fee", "passport renewal fee pakistan", "10 year passport fee", "72 page passport fee", "lost passport fee pakistan", "dgip passport fee", "e passport fee"],
  version: "1.0.0",
  lastReviewed: PASSPORT_FEES.reviewedAt,
  featured: true,
  sources: [PASSPORT_FEES.source],
  fields: [
    { key: "pages", label: "Pages", type: "select", options: [{ value: "36", label: "36 pages" }, { value: "72", label: "72 pages" }, { value: "100", label: "100 pages" }], default: "36" },
    { key: "years", label: "Validity", type: "select", options: [{ value: "5", label: "5 years" }, { value: "10", label: "10 years" }], default: "10" },
    { key: "service", label: "Service", type: "select", options: [{ value: "normal", label: "Normal" }, { value: "urgent", label: "Urgent" }, { value: "fastTrack", label: "Fast track (48 hours)" }], default: "normal" },
    { key: "reason", label: "Reason", type: "select", options: [{ value: "0", label: "New passport or renewal" }, { value: "1", label: "Lost or damaged: first time" }, { value: "2", label: "Lost: second time" }, { value: "3", label: "Lost: third time" }], default: "0" },
  ],
  compute(input) {
    const pages = (Number(str(input, "pages", "36")) || 36) as PassportPages;
    const years = (Number(str(input, "years", "10")) || 10) as PassportYears;
    const service = str(input, "service", "normal");
    const lost = Math.min(3, Math.max(0, Math.round(num(input, "reason", Number(str(input, "reason", "0"))))));
    const base = PASSPORT_FEES.base[pages]?.[years] ?? PASSPORT_FEES.base[36][10];
    const fastTrack = PASSPORT_FEES.fastTrack[pages]?.[years] ?? PASSPORT_FEES.fastTrack[36][10];
    const multiplier = PASSPORT_FEES.lostMultiplier[lost];
    const fastTrackAllowed = service === "fastTrack" && lost === 0;
    const fee = fastTrackAllowed ? fastTrack : (service === "urgent" ? base[1] : base[0]) * multiplier;
    const effectiveService = service === "fastTrack" && !fastTrackAllowed ? "urgent" : service;
    const delivery = PASSPORT_FEES.delivery[effectiveService as keyof typeof PASSPORT_FEES.delivery];
    const label = `${pages}-page, ${years}-year, ${effectiveService === "fastTrack" ? "fast track" : effectiveService}`;
    return {
      headline: { label: `Passport fee (${label})`, value: pkr(fee), primary: true },
      summary: `A ${pages}-page passport valid ${years} years costs ${pkr(fee)} ${effectiveService === "fastTrack" ? "on fast track" : `with ${effectiveService} processing`}${lost ? `, which is ${multiplier} times the standard fee because it replaces a lost passport (loss number ${lost})` : ""}. DGIP quotes delivery ${delivery}.`,
      sections: [
        {
          title: "Your options at a glance",
          lines: [
            { label: `Normal (${PASSPORT_FEES.delivery.normal})`, value: pkr(base[0] * multiplier), primary: effectiveService === "normal" },
            { label: `Urgent (${PASSPORT_FEES.delivery.urgent})`, value: pkr(base[1] * multiplier), primary: effectiveService === "urgent" },
            ...(lost === 0 ? [{ label: `Fast track (${PASSPORT_FEES.delivery.fastTrack})`, value: pkr(fastTrack), primary: effectiveService === "fastTrack" }] : []),
          ],
        },
        {
          title: "Same pages, other validity",
          lines: [
            { label: `${pages} pages, ${years === 5 ? 10 : 5} years, normal`, value: pkr((PASSPORT_FEES.base[pages][years === 5 ? 10 : 5] ?? base)[0] * multiplier), muted: true },
            { label: `${pages} pages, ${years === 5 ? 10 : 5} years, urgent`, value: pkr((PASSPORT_FEES.base[pages][years === 5 ? 10 : 5] ?? base)[1] * multiplier), muted: true },
          ],
        },
      ],
      warnings: [
        ...(service === "fastTrack" && lost > 0 ? ["Fast track is not offered for lost passports on DGIP's schedule; the urgent fee is shown instead."] : []),
        "Fees are for an ordinary passport paid in Pakistan. Missions abroad charge in local currency on a separate schedule. Delivery times are DGIP's stated processing times and can run longer.",
      ],
    };
  },
  methodology: `The Directorate General of Immigration & Passports publishes one fee chart for ordinary machine-readable passports, by **pages** (36, 72 or 100), **validity** (5 or 10 years) and **processing** (normal or urgent), and a separate **fast track** schedule that promises delivery within 48 hours.

A **lost or damaged** passport is replaced at a multiple of the standard fee: **2 times** the first time, **4 times** the second and **8 times** the third, in both normal and urgent categories.

The fee is paid before the appointment: online by QR code through 1Link or at the designated bank branches (National Bank of Pakistan and others), against the application token. The receipt number is entered at the passport office.`,
  faqs: [
    { question: "What is the passport fee in Pakistan for 10 years?", answer: "A 36-page passport valid 10 years costs Rs 6,700 normal, Rs 11,200 urgent or Rs 16,200 on fast track. A 72-page 10-year passport is Rs 12,400 normal and Rs 20,200 urgent." },
    { question: "How much does an urgent passport cost?", answer: "Urgent processing costs Rs 7,500 (36 pages, 5 years) up to Rs 27,000 (100 pages, 10 years). DGIP quotes about four working days." },
    { question: "What is fast track passport fee?", answer: "Fast track delivers within 48 hours for Rs 12,500 (36 pages, 5 years), Rs 16,200 (36 pages, 10 years), Rs 18,500 or Rs 25,200 for 72 pages and Rs 23,000 or Rs 32,000 for 100 pages." },
    { question: "How much is the fee for a lost passport?", answer: "Double the standard fee the first time (Rs 9,000 for a 36-page 5-year normal passport), four times the second time and eight times the third time." },
    { question: "Is the renewal fee different from a new passport?", answer: "No. Renewal is charged at the same rate as a first issue for the pages, validity and processing you choose." },
  ],
  related: { tools: ["age-calculator"], guides: ["how-to-renew-cnic-online-nadra"], entities: ["nadra"] },
};
