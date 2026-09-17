import { CURRENT_TAX_YEAR, INCOME_TAX_REVIEWED_AT, computeIncomeTax } from "../data/income-tax";
import { num, str, type ToolDefinition } from "../types";
import { pct, pkr } from "@/lib/format";

export const salaryIncrementCalculator: ToolDefinition = {
  slug: "salary-increment-calculator",
  category: "finance",
  name: "Salary Increment Calculator (with Tax Impact)",
  seoTitle: "Salary Increment Calculator Pakistan 2026-27: New Salary, Tax on the Raise and Real Take-Home Increase",
  shortName: "Salary increment",
  description: "Enter your salary and the raise (percent or amount) to see the new gross, how much extra income tax you'll pay under the 2026-27 slabs, and what actually lands in your account.",
  keywords: ["salary increment calculator", "increment calculator pakistan", "salary raise calculator", "new salary after increment", "percentage increase salary", "tax on salary increment", "take home after increment", "annual increment calculator", "how to calculate increment percentage"],
  version: "1.0.0",
  lastReviewed: INCOME_TAX_REVIEWED_AT,
  sources: [CURRENT_TAX_YEAR.source],
  fields: [
    { key: "salary", label: "Current monthly salary (gross)", type: "number", unit: "PKR", default: 150_000, min: 0, step: 1000 },
    {
      key: "mode",
      label: "Raise given as",
      type: "select",
      options: [
        { value: "pct", label: "Percentage" },
        { value: "amount", label: "Amount per month" },
      ],
      default: "pct",
    },
    { key: "pct", label: "Increment", type: "number", unit: "%", default: 10, min: 0, max: 500, step: 0.5 },
    { key: "amount", label: "Increment", type: "number", unit: "PKR / month", default: 15_000, min: 0, step: 500 },
    { key: "inflation", label: "Inflation to compare against", type: "number", unit: "%", default: 4.5, min: 0, max: 50, step: 0.1, help: "Latest CPI from the data hub. A raise below inflation is a real-terms cut." },
  ],
  compute(input) {
    const salary = Math.max(0, num(input, "salary"));
    const byPct = str(input, "mode", "pct") !== "amount";
    const raise = byPct ? salary * (num(input, "pct", 10) / 100) : Math.max(0, num(input, "amount", 0));
    const newSalary = salary + raise;
    const raisePct = salary ? raise / salary : 0;
    const inflation = num(input, "inflation", 4.5) / 100;
    const before = computeIncomeTax(salary * 12, CURRENT_TAX_YEAR, "salaried");
    const after = computeIncomeTax(newSalary * 12, CURRENT_TAX_YEAR, "salaried");
    const extraTaxMonthly = (after.totalTax - before.totalTax) / 12;
    const netBefore = salary - before.totalTax / 12;
    const netAfter = newSalary - after.totalTax / 12;
    const realPct = (1 + raisePct) / (1 + inflation) - 1;
    return {
      headline: { label: "New monthly salary (gross)", value: pkr(newSalary), primary: true },
      summary: `A ${pct(raisePct)} raise takes you from ${pkr(salary)} to ${pkr(newSalary)} gross. Income tax rises by ${pkr(extraTaxMonthly)} a month, so take-home goes from ${pkr(netBefore)} to ${pkr(netAfter)}, ${pkr(netAfter - netBefore)} more in hand (${pct(netBefore ? (netAfter - netBefore) / netBefore : 0)}). Against ${pct(inflation)} inflation the real increase is ${pct(realPct)}.`,
      sections: [
        {
          title: "Gross",
          lines: [
            { label: "Current salary", value: pkr(salary) },
            { label: `Increment (${pct(raisePct)})`, value: pkr(raise) },
            { label: "New salary", value: pkr(newSalary), primary: true },
            { label: "New annual salary", value: pkr(newSalary * 12), muted: true },
          ],
        },
        {
          title: `Tax and take-home (${CURRENT_TAX_YEAR.label})`,
          lines: [
            { label: "Monthly tax before", value: pkr(before.totalTax / 12) },
            { label: "Monthly tax after", value: pkr(after.totalTax / 12) },
            { label: "Extra tax per month", value: pkr(extraTaxMonthly) },
            { label: "Take-home before → after", value: `${pkr(netBefore)} → ${pkr(netAfter)}` },
            { label: "Share of the raise taken by tax", value: pct(raise ? extraTaxMonthly / raise : 0), muted: true },
            { label: "Marginal tax rate on the raise", value: pct(after.marginalRate), muted: true },
          ],
        },
        { title: "Real terms", lines: [{ label: `Raise vs ${pct(inflation)} inflation`, value: `${pct(realPct)} real`, note: realPct < 0 ? "Below inflation: your purchasing power falls." : "Above inflation: a genuine increase." }] },
      ],
      warnings: ["Tax is computed on salary alone under the salaried slabs; other income, tax credits and provident-fund deductions change the exact figure. EOBI and PF deductions are not included."],
    };
  },
  methodology: `New salary = current × (1 + increment%) or current + amount. The tax impact applies the **${CURRENT_TAX_YEAR.label} salaried slabs** to the annualised salary before and after the raise; the difference is the extra tax, and the marginal rate shows how much of every extra rupee goes to FBR (1% to 35% depending on the slab). The real-terms line deflates the raise by the CPI figure: real = (1 + raise) ÷ (1 + inflation) − 1.`,
  faqs: [
    { question: "How do I calculate increment percentage?", answer: "(New salary − old salary) ÷ old salary × 100. A raise from Rs 150,000 to Rs 165,000 is 10%." },
    { question: "Why is my take-home increase smaller than the raise?", answer: "Because the extra income is taxed at your marginal slab rate (11% in the Rs 1.2–2.2M band, rising to 35% above Rs 7M a year), and a raise can push part of your income into a higher slab." },
    { question: "What is a good increment in Pakistan?", answer: "Anything above inflation (about 4–6% in 2026) is a real increase; market moves for skilled roles run 20–40%. Compare the real-terms line here, not the headline percentage." },
    { question: "Does the increment affect EOBI or provident fund?", answer: "EOBI is fixed on the minimum wage, so no. Provident fund is usually a percentage of basic salary, so it rises with the raise." },
  ],
  related: { tools: ["income-tax-calculator", "salary-breakdown-calculator", "eobi-calculator"], guides: ["how-to-file-income-tax-return-pakistan"], entities: ["fbr", "income-tax"], businessCategories: ["tax-consultants"] },
};
