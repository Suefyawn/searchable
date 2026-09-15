import { annualPctFor, incomeTax234, INCOME_TAX_234, SCHEDULES, type Province } from "../data/token-tax";
import { bool, num, str, type ResultLine, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

const REVIEWED = "2026-09-15";

function provinceOf(v: string): Province {
  return v === "islamabad" ? "islamabad" : "punjab";
}

export const tokenTaxCalculator: ToolDefinition = {
  slug: "token-tax-calculator",
  category: "cars",
  name: "Token Tax Calculator 2026-27",
  seoTitle: "Token Tax Calculator 2026-27: Punjab & Islamabad Vehicle Token Tax (Filer vs Non-Filer)",
  shortName: "Token Tax",
  description: "Calculate the annual token tax on your car or bike for FY2026-27 in Punjab and Islamabad, token tax by engine capacity and invoice value, income tax under section 234 for filers and non-filers, professional tax and the 10% early-payment rebate.",
  keywords: ["token tax calculator", "token tax", "vehicle token tax", "token tax punjab", "token tax islamabad", "car token tax 2026", "motor vehicle tax pakistan", "excise token tax", "token tax rates 2026-27", "lifetime token tax 1000cc", "e-pay punjab token tax"],
  version: "1.0.0",
  lastReviewed: REVIEWED,
  featured: true,
  sources: [
    { ...SCHEDULES.punjab.source, date: REVIEWED },
    { ...SCHEDULES.islamabad.source, date: "2026-06-27" },
    { title: "Income Tax Ordinance 2001, s.234 and First Schedule, Part IV, Division III (tax collected with motor vehicle tax)", url: "https://www.fbr.gov.pk/", publisher: "Federal Board of Revenue" },
  ],
  fields: [
    {
      key: "province",
      label: "Registered in",
      type: "select",
      options: [
        { value: "punjab", label: "Punjab" },
        { value: "islamabad", label: "Islamabad (ICT)" },
      ],
      default: "punjab",
      help: "Sindh, KP and Balochistan are not included yet, their annual schedules are not published in a verifiable form.",
    },
    {
      key: "vehicle",
      label: "Vehicle",
      type: "select",
      options: [
        { value: "car", label: "Car / jeep / SUV (private)" },
        { value: "motorcycle", label: "Motorcycle / scooter" },
      ],
      default: "car",
    },
    { key: "cc", label: "Engine capacity", type: "number", unit: "cc", default: 1300, min: 50, max: 8000, step: 10, help: "As printed on the registration book. Electric vehicles: use the petrol-equivalent band the Excise office assigned." },
    { key: "invoice", label: "Invoice value", type: "number", unit: "PKR", default: 4_500_000, min: 0, step: 50_000, help: "Price on the manufacturer's / dealer's invoice (ex-factory, before registration). Only used for cars above 1000cc." },
    {
      key: "filer",
      label: "FBR filer status",
      type: "select",
      options: [
        { value: "filer", label: "Filer (on Active Taxpayer List)" },
        { value: "nonfiler", label: "Non-filer" },
      ],
      default: "filer",
      help: "Non-filers pay income tax at 300% of the filer rate.",
    },
    { key: "early", label: "Paying full year by 31 August", type: "boolean", default: false, help: "Punjab gives a 10% rebate on the annual token if the whole year is paid in July–August." },
  ],
  compute(input) {
    const province = provinceOf(str(input, "province", "punjab"));
    const s = SCHEDULES[province];
    const vehicle = str(input, "vehicle", "car") === "motorcycle" ? "motorcycle" : "car";
    const cc = Math.max(0, num(input, "cc", 1300));
    const invoice = Math.max(0, num(input, "invoice", 0));
    const filer = str(input, "filer", "filer") !== "nonfiler";
    const early = bool(input, "early");
    const warnings: string[] = [];

    if (vehicle === "motorcycle") {
      const token = s.motorcycleLifetime;
      return {
        headline: { label: `Lifetime token tax (${s.name})`, value: pkr(token), primary: true },
        summary: `Motorcycles in ${s.name} pay a one-time lifetime token of ${pkr(token)} at registration. No annual token, income tax or professional tax is collected afterwards.`,
        sections: [{ title: "Breakdown", lines: [{ label: "Lifetime token (paid once at registration)", value: pkr(token) }, { label: "Annual token thereafter", value: pkr(0), muted: true }] }],
        warnings: ["Motorcycles registered before the lifetime regime were told to pay the lifetime amount once to regularise; check your ePay / Excise record for arrears."],
      };
    }

    if (cc <= 1000) {
      const token = s.lifetimeUpTo1000;
      const it = filer ? INCOME_TAX_234.lumpSumUpTo1000.filer : INCOME_TAX_234.lumpSumUpTo1000.nonFiler;
      const itOther = filer ? INCOME_TAX_234.lumpSumUpTo1000.nonFiler : INCOME_TAX_234.lumpSumUpTo1000.filer;
      const prof = s.professionalTax;
      const total = token + it + prof;
      const lines: ResultLine[] = [
        { label: "Lifetime token (paid once at registration)", value: pkr(token) },
        { label: `Income tax u/s 234: lump sum, ${filer ? "filer" : "non-filer"}`, value: pkr(it) },
        ...(prof ? [{ label: "Professional tax (per year)", value: pkr(prof) }] : []),
        { label: "Payable at registration", value: pkr(total), primary: true },
      ];
      return {
        headline: { label: `Lifetime token + taxes (${s.name})`, value: pkr(total), primary: true },
        summary: `Cars up to 1000cc in ${s.name} pay a one-time lifetime token of ${pkr(token)} plus a lump-sum income tax of ${pkr(it)} (${filer ? "non-filer" : "filer"} would be ${pkr(itOther)}). There is no annual token afterwards${prof ? `; only the ${pkr(prof)} professional tax recurs each year` : ""}.`,
        sections: [
          { title: "Breakdown", lines },
          { title: "Filer vs non-filer", lines: [{ label: "Income tax as filer", value: pkr(INCOME_TAX_234.lumpSumUpTo1000.filer) }, { label: "Income tax as non-filer", value: pkr(INCOME_TAX_234.lumpSumUpTo1000.nonFiler) }] },
        ],
        warnings: [
          "If the car is transferred within 10 years of registration the new owner pays the lifetime token again, less 10% for every financial year already elapsed.",
          "Cars up to 1000cc registered before the lifetime regime (2023 in Punjab) may still be on the old annual schedule; confirm on ePay Punjab / Excise ICT.",
        ],
      };
    }

    const pct = annualPctFor(s, cc);
    const tokenGross = Math.round(invoice * pct);
    const rebate = early && s.earlyRebate ? Math.round(tokenGross * s.earlyRebate) : 0;
    const token = tokenGross - rebate;
    const it = incomeTax234(cc, filer);
    const itOther = incomeTax234(cc, !filer);
    const prof = s.professionalTax;
    const total = token + it + prof;
    if (!invoice) warnings.push("Enter the invoice value, token tax for cars above 1000cc is a percentage of it.");
    if (early && !s.earlyRebate) warnings.push(`${s.name} does not publish an early-payment rebate; none has been applied.`);
    warnings.push("Excise offices use the invoice value recorded at first registration. Vehicles registered before 1 July 2024 in Punjab may be assessed on a different basis, confirm on ePay Punjab.");

    const band = cc <= 2000 ? "1001–2000cc" : "above 2000cc";
    return {
      headline: { label: `Annual token tax + taxes (${s.name}, FY${s.fiscalYear})`, value: pkr(total), primary: true },
      summary: `A ${cc.toLocaleString()}cc car (${band}) with an invoice value of ${pkr(invoice)} pays ${(pct * 100).toFixed(2)}% = ${pkr(tokenGross)} token tax per year in ${s.name}${rebate ? `, less a 10% early-payment rebate of ${pkr(rebate)}` : ""}, plus ${pkr(it)} income tax as a ${filer ? "filer" : "non-filer"}${prof ? ` and ${pkr(prof)} professional tax` : ""}.`,
      sections: [
        {
          title: "Breakdown",
          lines: [
            { label: `Token tax: ${(pct * 100).toFixed(2)}% of ${pkr(invoice)}`, value: pkr(tokenGross) },
            ...(rebate ? [{ label: "Early-payment rebate (10%)", value: `− ${pkr(rebate)}` }] : []),
            { label: `Income tax u/s 234: ${filer ? "filer" : "non-filer"}`, value: pkr(it) },
            ...(prof ? [{ label: "Professional tax", value: pkr(prof) }] : []),
            { label: "Total payable this year", value: pkr(total), primary: true },
            { label: "Per month, for budgeting", value: pkr(total / 12), muted: true },
          ],
        },
        {
          title: "Filer vs non-filer",
          lines: [
            { label: "Total as filer", value: pkr(token + (filer ? it : itOther) + prof) },
            { label: "Total as non-filer", value: pkr(token + (filer ? itOther : it) + prof) },
            { label: "Saved by being on the ATL", value: pkr(Math.abs(it - itOther)), muted: true },
          ],
        },
        ...(!early && s.earlyRebate ? [{ title: "If paid by 31 August", lines: [{ label: "Token after 10% rebate", value: pkr(tokenGross - Math.round(tokenGross * s.earlyRebate)) }, { label: "Total payable", value: pkr(tokenGross - Math.round(tokenGross * s.earlyRebate) + it + prof) }] }] : []),
      ],
      warnings,
    };
  },
  methodology: `Token tax is the annual motor vehicle tax charged by the provincial Excise & Taxation department under the **Motor Vehicles Taxation Act 1958** (and the Islamabad equivalent). It is collected together with two other items: **income tax under section 234** of the Income Tax Ordinance (a federal advance tax, higher for non-filers) and, in Punjab, **professional tax** of Rs 200.

**Punjab, FY2026-27** (Excise & Taxation Punjab, official rate table):
- Motorcycles: Rs 1,500 lifetime, paid once at registration.
- Cars up to 1000cc: Rs 20,000 lifetime, paid once (was Rs 15,000 in 2023-24). No annual token afterwards.
- 1001–2000cc: **0.3% of the invoice value per year** (0.2% in 2025-26).
- Above 2000cc: **0.4% of the invoice value per year** (0.3% in 2025-26).
- 10% rebate on the annual token if the full year is paid by 31 August.
- On transfer within 10 years, lifetime tax is charged again with a 10% reduction for each financial year elapsed.

**Islamabad (ICT), from 1 July 2026** (Finance Act 2026-27): Rs 20,000 lifetime up to 1000cc; **0.25%** of invoice value for 1001–2000cc; **0.35%** above 2000cc.

**Income tax u/s 234 (filer / non-filer):** up to 1000cc a lump sum of Rs 10,000 / 30,000 collected with the lifetime token; 1001–1199cc Rs 1,500 / 4,500; 1200–1299cc Rs 1,750 / 5,250; 1300–1499cc Rs 2,500 / 7,500; 1500–1599cc Rs 3,750 / 11,250; 1600–1999cc Rs 4,500 / 13,500; 2000cc and above Rs 10,000 / 30,000 per year.

Sindh, KP and Balochistan run their own schedules. Sindh's lifetime rule for ≤1000cc (Rs 20,000) and motorcycles (Rs 1,800 up to 149cc, Rs 3,000 above) is published, but its annual rates above 1000cc are not, so the tool leaves those provinces out rather than guess.`,
  faqs: [
    { question: "How is token tax calculated in Punjab in 2026?", answer: "For cars above 1000cc it is a percentage of the invoice value: 0.3% per year for 1001–2000cc and 0.4% for larger engines. Cars up to 1000cc pay a one-time lifetime token of Rs 20,000 instead. Income tax under section 234 and Rs 200 professional tax are added on the same challan." },
    { question: "What is lifetime token tax?", answer: "A one-time payment at registration that replaces the annual token for the life of the vehicle. It applies to motorcycles and to cars up to 1000cc in Punjab, Islamabad and Sindh. If the vehicle is sold within 10 years, the buyer pays it again with a 10% reduction for each year already elapsed." },
    { question: "Why is my token tax higher as a non-filer?", answer: "The token itself is the same, but the income tax collected with it under section 234 is 300% of the filer rate. Getting onto the Active Taxpayer List before paying saves Rs 3,000–20,000 a year depending on engine size." },
    { question: "When is token tax due?", answer: "The financial year runs July–June. Punjab gives a 10% rebate if you pay the full year by 31 August; paying late attracts a penalty and the vehicle can be impounded at checkpoints." },
    { question: "How do I pay token tax online?", answer: "Punjab: ePay Punjab app or e-Pay portal: enter the registration number, generate a PSID and pay through any bank app, ATM or 1Link. Islamabad: the Excise ICT portal (islamabadexcise.gov.pk) and City Islamabad app. Sindh: excise.gos.pk e-services." },
    { question: "Is there token tax on electric vehicles?", answer: "Punjab charges EVs on a kW-equivalent band and has offered concessions in some years; Islamabad has waived token tax on EVs in some budgets. Check the current year's notification: this calculator covers petrol and diesel vehicles." },
  ],
  related: { tools: ["car-loan-calculator", "fuel-cost-calculator", "income-tax-calculator"], guides: ["how-to-register-a-vehicle-in-punjab", "how-to-check-filer-status-atl-pakistan"], entities: ["fbr", "toyota", "suzuki"], businessCategories: ["car-dealers"] },
};
