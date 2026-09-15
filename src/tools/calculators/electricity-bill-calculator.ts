import { ELECTRICITY, type TariffSlab } from "../data/rates";
import { bool, num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

function energyCharge(units: number, slabs: TariffSlab[]) {
  // Units up to 200 are billed telescopically (each slab for its own range). Above 200 units
  // the slab benefit is withdrawn: the entire consumption is billed at the rate of the slab reached.
  const lines: { label: string; units: number; rate: number; amount: number }[] = [];
  if (units <= 200) {
    let remaining = units;
    for (const s of slabs) {
      if (remaining <= 0) break;
      const width = (s.to ?? Infinity) - s.from + 1;
      const take = Math.min(remaining, width);
      lines.push({ label: `${s.from}–${s.to ?? "∞"} units`, units: take, rate: s.rate, amount: take * s.rate });
      remaining -= take;
    }
  } else {
    const slab = slabs.find((s) => s.to === null || units <= s.to) ?? slabs[slabs.length - 1];
    lines.push({ label: `All ${units} units @ ${slab.from}–${slab.to ?? "∞"} slab`, units, rate: slab.rate, amount: units * slab.rate });
  }
  return { lines, total: lines.reduce((a, l) => a + l.amount, 0) };
}

export const electricityBillCalculator: ToolDefinition = {
  slug: "electricity-bill-calculator",
  category: "utilities",
  name: "Electricity Bill Calculator (LESCO, IESCO, MEPCO, K-Electric)",
  seoTitle: "LESCO Bill Calculator: Electricity Bill Calculator Pakistan with Per-Unit Price 2026",
  shortName: "Electricity Bill",
  description: "Electricity bill calculator for LESCO, IESCO, MEPCO, GEPCO, FESCO, PESCO and K-Electric. Enter units to see your bill with the current per-unit price, GST, FC surcharge and duties.",
  keywords: ["lesco bill calculator", "electricity bill calculator", "electricity bill calculator pakistan", "iesco bill calculator", "mepco bill calculator", "k electric bill calculator", "per unit electricity price in pakistan", "electricity unit price in pakistan 2026", "electricity rates in pakistan", "lesco tariff", "units to bill", "bijli bill"],
  version: "1.0.0",
  lastReviewed: ELECTRICITY.reviewedAt,
  featured: true,
  sources: [ELECTRICITY.source],
  fields: [
    { key: "units", label: "Units consumed (kWh)", type: "number", unit: "kWh", default: 350, min: 0, step: 10 },
    {
      key: "consumer",
      label: "Consumer category",
      type: "select",
      options: [
        { value: "unprotected", label: "Unprotected (most households)" },
        { value: "protected", label: "Protected (≤ 200 units for 6 months)" },
      ],
      default: "unprotected",
    },
    { key: "fpa", label: "Fuel price adjustment", type: "number", unit: "PKR/unit", default: ELECTRICITY.defaultFpaPerUnit, min: -10, max: 15, step: 0.1, help: "Printed on your bill; changes monthly. Leave 0 if unknown." },
    { key: "tv", label: "Include PTV licence fee", type: "boolean", default: true },
  ],
  compute(input) {
    const units = Math.max(0, Math.round(num(input, "units")));
    const consumer = str(input, "consumer", "unprotected") === "protected" && units <= 200 ? "protected" : "unprotected";
    const { lines, total: energy } = energyCharge(units, ELECTRICITY[consumer]);
    const fpa = units * num(input, "fpa", 0);
    const fcSurcharge = units * ELECTRICITY.fcSurchargePerUnit;
    const variable = energy + fpa + fcSurcharge;
    const duty = variable * ELECTRICITY.electricityDutyRate;
    const gst = (variable + duty) * ELECTRICITY.gstRate;
    const tv = bool(input, "tv", true) ? ELECTRICITY.tvLicenseFee : 0;
    const total = variable + duty + gst + tv;

    return {
      headline: { label: "Estimated monthly bill", value: pkr(total), primary: true },
      summary: `${units} units at the ${consumer} tariff cost ${pkr(energy)} in energy charges; taxes and surcharges add ${pkr(total - energy)} (${Math.round(((total - energy) / Math.max(1, energy)) * 100)}%). That is ${pkr(total / Math.max(1, units))} per unit all-in.`,
      sections: [
        {
          title: "Energy charge",
          lines: [...lines.map((l) => ({ label: `${l.label} × Rs ${l.rate.toFixed(2)}`, value: pkr(l.amount), muted: true })), { label: "Energy charge", value: pkr(energy), primary: true }],
        },
        {
          title: "Surcharges & taxes",
          lines: [
            { label: `Fuel price adjustment (${units} × Rs ${num(input, "fpa", 0).toFixed(2)})`, value: pkr(fpa), muted: fpa === 0 },
            { label: `FC surcharge (${units} × Rs ${ELECTRICITY.fcSurchargePerUnit})`, value: pkr(fcSurcharge) },
            { label: `Electricity duty (${ELECTRICITY.electricityDutyRate * 100}%)`, value: pkr(duty) },
            { label: `GST (${ELECTRICITY.gstRate * 100}%)`, value: pkr(gst) },
            { label: "PTV licence fee", value: pkr(tv), muted: tv === 0 },
            { label: "Total bill", value: pkr(total), primary: true },
          ],
        },
      ],
      warnings: [
        "Quarterly tariff adjustments, income-tax withholding for non-filers, and arrears are not included. Treat this as a close estimate, not your exact bill.",
        units > 200 && consumer === "unprotected" ? "Above 200 units the whole consumption is billed at the higher slab rate, reducing usage below a slab boundary can cut the bill sharply." : "",
      ].filter(Boolean),
    };
  },
  methodology: `Your bill = **energy charge** (units × slab rate) + **fuel price adjustment** + **financing-cost surcharge** + **electricity duty** (provincial, 1.5% of the variable charge) + **GST** (17%) + fixed fees.

NEPRA sets a uniform residential tariff for all distribution companies (LESCO, IESCO, GEPCO, FESCO, MEPCO, PESCO, HESCO, SEPCO, QESCO, TESCO and K-Electric). **Protected** consumers, those who have used 200 units or less for six consecutive months, pay heavily subsidised slab rates. Everyone else is **unprotected**.

For unprotected consumers using more than 200 units, the entire consumption is billed at the rate of the slab reached (the previous "slab benefit" no longer applies), which is why crossing 300 or 400 units produces a jump in the bill.`,
  faqs: [
    { question: "Why did my bill jump when I used slightly more units?", answer: "Above 200 units your whole consumption moves to the higher slab rate. Going from 300 to 301 units changes the rate applied to all 301 units." },
    { question: "What is FPA?", answer: "Fuel Price Adjustment passes on the difference between the fuel cost assumed in the tariff and the actual cost. It changes monthly and can be negative." },
    { question: "How do I become a protected consumer?", answer: "Keep consumption at or below 200 units for six consecutive months. Exceeding 200 in any month resets the count." },
    { question: "Is income tax charged on electricity bills?", answer: "Withholding tax applies on higher bills, and at a higher rate for non-filers. It is not included here." },
  ],
  related: { tools: ["solar-payback-calculator"], guides: ["how-to-apply-for-net-metering-in-pakistan", "how-to-get-a-new-electricity-connection"], entities: ["nepra", "lesco", "k-electric"], businessCategories: ["solar-companies", "electricians"] },
};
