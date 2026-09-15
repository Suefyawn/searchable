import { REFERENCE_RATES } from "../data/rates";
import { num, type ToolDefinition } from "../types";
import { pkr, pct } from "@/lib/format";

export const homeLoanCalculator: ToolDefinition = {
  slug: "home-loan-calculator",
  category: "finance",
  name: "Home Loan Calculator Pakistan",
  seoTitle: "Home Loan Calculator Pakistan: House Finance Monthly Installment & Affordability",
  shortName: "Home Loan",
  description: "Monthly installment, total mark-up and how much house you can afford on your income, for bank home loans and Islamic house finance in Pakistan.",
  keywords: ["home loan calculator pakistan", "house loan calculator", "house finance pakistan", "mortgage calculator pakistan", "meezan home finance calculator", "home loan installment", "kibor home loan"],
  version: "1.0.0",
  lastReviewed: REFERENCE_RATES.reviewedAt,
  sources: [{ title: "SBP: Housing finance and KIBOR", url: "https://www.sbp.org.pk", publisher: "State Bank of Pakistan" }],
  fields: [
    { key: "price", label: "Property price", type: "number", unit: "PKR", default: 15_000_000, min: 500_000, step: 250_000 },
    { key: "downPct", label: "Your contribution (down payment)", type: "number", unit: "%", default: 30, min: 10, max: 90, step: 5, help: "Banks finance up to 70–85% of the value depending on the product." },
    { key: "rate", label: "Annual rate", type: "number", unit: "%", default: REFERENCE_RATES.kibor1y + 3, min: 1, max: 40, step: 0.25, help: `Usually 1-year KIBOR (~${REFERENCE_RATES.kibor1y}%) + 2–4% spread.` },
    { key: "years", label: "Tenure", type: "select", options: [5, 10, 15, 20, 25].map((y) => ({ value: String(y), label: `${y} years` })), default: "20" },
    { key: "income", label: "Household monthly income (optional)", type: "number", unit: "PKR", default: 400_000, min: 0, step: 10_000, help: "Used to check affordability: banks cap instalments at ~40–50% of income." },
  ],
  compute(input) {
    const price = num(input, "price");
    const down = price * (num(input, "downPct") / 100);
    const principal = price - down;
    const r = num(input, "rate") / 100 / 12;
    const n = Math.round(num(input, "years", 20) * 12);
    const inst = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
    const total = inst * n;
    const markup = total - principal;
    const income = num(input, "income");
    const ratio = income > 0 ? inst / income : 0;
    const maxLoan = income > 0 ? (income * 0.45 * (1 - Math.pow(1 + r, -n))) / (r || 1 / n) : 0;

    return {
      headline: { label: "Monthly instalment", value: pkr(inst), primary: true },
      summary: `Financing ${pkr(principal)} over ${n / 12} years costs ${pkr(markup)} in mark-up, the home ends up costing ${pkr(down + total)}.${income > 0 ? ` The instalment is ${pct(ratio)} of your income${ratio > 0.5 ? ", above what most banks allow." : ratio > 0.4 ? ", near the upper limit." : "."}` : ""}`,
      sections: [
        {
          title: "Loan",
          lines: [
            { label: "Property price", value: pkr(price) },
            { label: `Down payment (${num(input, "downPct")}%)`, value: pkr(down) },
            { label: "Amount financed", value: pkr(principal), primary: true },
          ],
        },
        {
          title: "Cost",
          lines: [
            { label: `${n} instalments of`, value: pkr(inst) },
            { label: "Total mark-up", value: pkr(markup) },
            { label: "Total paid to bank", value: pkr(total), muted: true },
            { label: "Total cost of home", value: pkr(down + total), primary: true },
          ],
        },
        ...(income > 0
          ? [
              {
                title: "Affordability",
                lines: [
                  { label: "Instalment as share of income", value: pct(ratio) },
                  { label: "Maximum loan at 45% of income", value: pkr(maxLoan), muted: true },
                ],
              },
            ]
          : []),
      ],
      warnings: ["Most house finance in Pakistan is floating-rate: the instalment is re-priced as KIBOR moves. Property insurance, valuation and processing fees are extra."],
    };
  },
  methodology: `Standard amortising instalment: *P × r ÷ (1 − (1 + r)^−n)* where P is the amount financed, r the monthly rate and n the months.

Islamic **Diminishing Musharakah** (used by Meezan, Faysal, and Islamic windows) is structured as joint ownership with rent plus unit purchase, but the monthly outflow tracks the same formula at the bank's profit rate.

Affordability follows the common bank rule that the instalment should not exceed 40–50% of verifiable household income.`,
  faqs: [
    { question: "How much house loan can I get on my salary?", answer: "Roughly the loan whose instalment is 40–50% of your net income. At a 14% rate over 20 years, each Rs 100,000 of monthly instalment supports about Rs 8 million of financing." },
    { question: "What is the minimum down payment?", answer: "Typically 15–30% of the property value; lower for first-time buyers under government-supported schemes when they are open." },
    { question: "Fixed or floating?", answer: "Almost all products are floating, re-priced annually or semi-annually against KIBOR. A few offer fixed rates for the first 1–3 years." },
  ],
  related: { tools: ["car-loan-calculator", "income-tax-calculator", "plot-size-converter"], entities: ["sbp", "meezan-bank", "hbl"], businessCategories: ["real-estate-agents", "banks"] },
};
