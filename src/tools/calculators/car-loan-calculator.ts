import { REFERENCE_RATES } from "../data/rates";
import { num, type ToolDefinition } from "../types";
import { pkr, pct } from "@/lib/format";

export const carLoanCalculator: ToolDefinition = {
  slug: "car-loan-calculator",
  category: "cars",
  name: "Car Financing Calculator Pakistan",
  seoTitle: "Car Financing Calculator Pakistan: Monthly Installment for Bank & Meezan Car Loans",
  shortName: "Car Loan",
  description: "Work out your monthly car loan installment, total mark-up and total cost for bank car financing or Meezan car Ijarah at KIBOR-linked rates.",
  keywords: ["car financing calculator", "car loan calculator pakistan", "meezan car finance calculator", "car installment calculator", "car finance pakistan", "bank car loan installment", "car lease calculator", "auto loan calculator pakistan", "kibor car financing"],
  version: "1.0.0",
  lastReviewed: REFERENCE_RATES.reviewedAt,
  featured: true,
  sources: [{ title: "Standard amortisation formula; KIBOR reference from SBP", publisher: "State Bank of Pakistan", url: "https://www.sbp.org.pk/" }],
  fields: [
    { key: "price", label: "Car price", type: "number", unit: "PKR", default: 4_500_000, min: 100_000, step: 50_000 },
    { key: "downPct", label: "Down payment", type: "number", unit: "%", default: 30, min: 0, max: 90, step: 5, help: "Banks typically require 20–35%." },
    { key: "rate", label: "Annual mark-up rate", type: "number", unit: "%", default: REFERENCE_RATES.kibor1y + 3, min: 1, max: 40, step: 0.25, help: `Usually 1-year KIBOR (~${REFERENCE_RATES.kibor1y}%) + bank spread of 2–4%.` },
    { key: "years", label: "Tenure", type: "select", options: [1, 2, 3, 4, 5, 7].map((y) => ({ value: String(y), label: `${y} year${y > 1 ? "s" : ""}` })), default: "5" },
    { key: "processingFee", label: "Processing fee", type: "number", unit: "PKR", default: 10_000, min: 0, step: 1000 },
  ],
  compute(input) {
    const price = num(input, "price");
    const down = price * (num(input, "downPct") / 100);
    const principal = price - down;
    const annualRate = num(input, "rate") / 100;
    const r = annualRate / 12;
    const n = Math.round(num(input, "years", 5) * 12);
    const instalment = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
    const totalPaid = instalment * n;
    const markup = totalPaid - principal;
    const fee = num(input, "processingFee");
    const totalCost = down + totalPaid + fee;

    // First-year split for the explanation.
    let balance = principal;
    let year1Interest = 0;
    for (let i = 0; i < Math.min(12, n); i++) {
      const interest = balance * r;
      year1Interest += interest;
      balance -= instalment - interest;
    }

    return {
      headline: { label: "Monthly instalment", value: pkr(instalment), primary: true },
      summary: `Financing ${pkr(principal)} over ${n} months at ${pct(annualRate)} costs ${pkr(markup)} in mark-up. The car ends up costing ${pkr(totalCost)}, ${pct(markup / price)} more than the cash price.`,
      sections: [
        {
          title: "Loan",
          lines: [
            { label: "Car price", value: pkr(price) },
            { label: `Down payment (${num(input, "downPct")}%)`, value: pkr(down) },
            { label: "Amount financed", value: pkr(principal), primary: true },
          ],
        },
        {
          title: "Cost of financing",
          lines: [
            { label: `${n} instalments of`, value: pkr(instalment) },
            { label: "Total mark-up", value: pkr(markup) },
            { label: "Mark-up in first year", value: pkr(year1Interest), muted: true },
            { label: "Processing fee", value: pkr(fee), muted: fee === 0 },
            { label: "Total cost of car", value: pkr(totalCost), primary: true },
          ],
        },
      ],
      warnings: ["Banks also charge insurance (typically 2–3.5% of the car value per year) and may adjust the rate as KIBOR moves on floating-rate products."],
    };
  },
  methodology: `The instalment uses the standard reducing-balance (amortising) formula:

*instalment = P × r ÷ (1 − (1 + r)^−n)*

where **P** is the amount financed, **r** the monthly rate (annual ÷ 12) and **n** the number of months. Each payment covers that month's mark-up on the remaining balance first; the rest reduces the principal, so early payments are mostly mark-up.

Islamic products (Ijarah / Diminishing Musharakah) are structured differently in contract but usually produce a comparable monthly figure at a comparable profit rate, so this calculator is a fair estimate for both.`,
  faqs: [
    { question: "What rate do banks charge for car loans?", answer: "Most conventional car loans are priced at 1-year KIBOR plus a spread of 2–4%. Islamic banks quote a profit rate that tracks the same benchmark." },
    { question: "Is a bigger down payment better?", answer: "A larger down payment reduces both the instalment and total mark-up. Banks reward it with lower spreads too." },
    { question: "Can I pay off early?", answer: "Yes, most banks allow early settlement after a lock-in period (often 1 year) with a small penalty of 1–3% of the outstanding amount." },
    { question: "Does this include insurance?", answer: "No. Comprehensive insurance is mandatory during the loan and costs roughly 2–3.5% of the vehicle value per year." },
  ],
  related: { tools: ["income-tax-calculator", "salary-breakdown-calculator"], guides: ["how-to-register-a-vehicle-in-punjab", "how-to-import-a-car-to-pakistan"], entities: ["toyota", "honda", "meezan-bank"], businessCategories: ["car-dealers"] },
};
