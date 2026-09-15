import { CURRENT_TAX_YEAR, computeIncomeTax } from "../data/income-tax";
import { LABOUR } from "../data/rates";
import { bool, num, type ToolDefinition } from "../types";
import { pkr, pct } from "@/lib/format";

export const salaryBreakdownCalculator: ToolDefinition = {
  slug: "salary-breakdown-calculator",
  category: "finance",
  name: "Salary Take-Home Calculator",
  shortName: "Take-Home Salary",
  description: "See exactly what lands in your account: gross salary minus income tax, EOBI and provident fund, with an annual view.",
  keywords: ["take home salary", "net salary calculator", "salary after tax", "in-hand salary pakistan", "provident fund", "EOBI deduction", "gross to net"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  featured: true,
  sources: [CURRENT_TAX_YEAR.source, LABOUR.source],
  fields: [
    { key: "gross", label: "Gross monthly salary", type: "number", unit: "PKR", default: 150_000, min: 0, step: 1000 },
    { key: "pfRate", label: "Provident fund contribution", type: "number", unit: "%", default: 0, min: 0, max: 20, step: 0.5, help: "Your share, usually 8.33% or 10% of basic. Leave 0 if none." },
    { key: "basicShare", label: "Basic salary as share of gross", type: "number", unit: "%", default: 60, min: 1, max: 100, help: "Provident fund is normally calculated on basic salary." },
    { key: "eobi", label: "EOBI deducted", type: "boolean", default: true, help: `Employee contribution is ${pct(LABOUR.eobiEmployeeRate)} of minimum wage (${pkr(LABOUR.minimumWage)}).` },
    { key: "bonusMonths", label: "Annual bonus (months of salary)", type: "number", default: 0, min: 0, max: 6, step: 0.5 },
  ],
  compute(input) {
    const gross = num(input, "gross");
    const pfRate = num(input, "pfRate") / 100;
    const basic = gross * (num(input, "basicShare", 60) / 100);
    const eobi = bool(input, "eobi", true) ? Math.round(LABOUR.minimumWage * LABOUR.eobiEmployeeRate) : 0;
    const bonus = gross * num(input, "bonusMonths");
    const annualGross = gross * 12 + bonus;
    const tax = computeIncomeTax(annualGross, CURRENT_TAX_YEAR, "salaried");
    const monthlyTax = tax.totalTax / 12;
    const pf = basic * pfRate;
    const net = gross - monthlyTax - pf - eobi;

    return {
      headline: { label: "Monthly take-home", value: pkr(net), primary: true },
      summary: `Of your ${pkr(gross)} gross, ${pkr(gross - net)} (${pct((gross - net) / gross)}) goes to tax and deductions. Your provident fund still belongs to you — it is savings, not a cost.`,
      sections: [
        {
          title: "Monthly deductions",
          lines: [
            { label: "Income tax (annualised, incl. bonus)", value: `− ${pkr(monthlyTax)}` },
            { label: `Provident fund (${pct(pfRate)} of basic ${pkr(basic)})`, value: `− ${pkr(pf)}` },
            { label: "EOBI", value: `− ${pkr(eobi)}` },
            { label: "Net salary", value: pkr(net), primary: true },
          ],
        },
        {
          title: "Annual",
          lines: [
            { label: "Gross (incl. bonus)", value: pkr(annualGross) },
            { label: "Income tax", value: pkr(tax.totalTax) },
            { label: "Effective tax rate", value: pct(tax.effectiveRate), muted: true },
            { label: "Provident fund saved", value: pkr(pf * 12), muted: true },
            { label: "Net cash received", value: pkr(net * 12 + bonus - (bonus > 0 ? 0 : 0)), primary: true },
          ],
        },
      ],
      warnings: ["Bonus is taxed in the month it is paid, so that month's deduction will be higher than the average shown here."],
    };
  },
  methodology: `Take-home = gross − income tax − provident fund − EOBI.

**Income tax** is computed on annualised salary (gross × 12 + bonus) using the salaried slabs, then divided by 12 — the same method employers use for monthly withholding under section 149.

**Provident fund** is the employee's own contribution, typically a percentage of *basic* salary (not gross). The employer usually matches it; that match is not shown because it never passes through your salary.

**EOBI** employee contribution is 1% of the federal minimum wage regardless of your salary.`,
  faqs: [
    { question: "Is provident fund taxable?", answer: "Contributions to a recognised provident fund are exempt within limits, and withdrawals after the qualifying period are exempt. This calculator treats it as a deduction from cash, not as taxable income." },
    { question: "Why is my bonus month different?", answer: "Employers tax the bonus when it is paid. The calculator spreads it evenly to show a realistic average month." },
    { question: "What about medical or conveyance allowance?", answer: "Some allowances have partial exemptions. Enter your taxable gross for the most accurate figure." },
  ],
  related: { tools: ["income-tax-calculator", "zakat-calculator"], guides: ["how-to-become-a-tax-filer-in-pakistan"], entities: ["fbr", "eobi"] },
};
