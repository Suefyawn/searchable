import { CURRENT_TAX_YEAR, TAX_YEARS, computeIncomeTax, getTaxYear } from "../data/income-tax";
import { num, str, type ToolDefinition } from "../types";
import { pkr, pct } from "@/lib/format";

export const incomeTaxCalculator: ToolDefinition = {
  slug: "income-tax-calculator",
  category: "tax",
  name: "Income Tax Calculator Pakistan 2025-26",
  seoTitle: "Income Tax Calculator Pakistan 2025-26 — Salary Tax Calculator (FBR Slabs)",
  shortName: "Income Tax",
  description: "Free salary tax calculator for Pakistan: enter your monthly salary and see income tax under the FBR 2025-26 slabs, your take-home, effective rate and slab.",
  keywords: ["income tax calculator pakistan", "salary tax calculator pakistan", "tax calculator pakistan", "income tax slabs 2025-26", "fbr tax calculator", "salary tax slabs", "income tax on salary in pakistan", "tax on 100000 salary in pakistan", "tax on 200000 salary", "tax on 300000 salary in pakistan", "income tax rates in pakistan"],
  version: "1.1.0",
  lastReviewed: "2026-09-15",
  featured: true,
  sources: [CURRENT_TAX_YEAR.source],
  fields: [
    { key: "income", label: "Monthly income", type: "number", unit: "PKR", placeholder: "250,000", min: 0, step: 1000, default: 250_000, help: "Gross salary or taxable income per month." },
    { key: "period", label: "This amount is", type: "select", options: [{ value: "monthly", label: "Per month" }, { value: "annual", label: "Per year" }], default: "monthly" },
    {
      key: "kind",
      label: "Income type",
      type: "select",
      options: [
        { value: "salaried", label: "Salaried (salary > 75% of income)" },
        { value: "nonSalaried", label: "Business / non-salaried individual" },
      ],
      default: "salaried",
    },
    { key: "year", label: "Tax year", type: "select", options: TAX_YEARS.map((t) => ({ value: t.year, label: t.label })), default: CURRENT_TAX_YEAR.year },
  ],
  compute(input) {
    const raw = num(input, "income");
    const period = str(input, "period", "monthly");
    const annual = period === "monthly" ? raw * 12 : raw;
    const kind = str(input, "kind", "salaried") === "nonSalaried" ? "nonSalaried" : "salaried";
    const year = getTaxYear(str(input, "year", CURRENT_TAX_YEAR.year));
    const tax = computeIncomeTax(annual, year, kind);
    const monthlyTax = tax.totalTax / 12;
    const takeHomeMonthly = annual / 12 - monthlyTax;

    return {
      headline: { label: "Monthly income tax", value: pkr(monthlyTax), primary: true },
      summary:
        tax.totalTax === 0
          ? `Income up to ${pkr(600_000)} per year is exempt. You pay no income tax.`
          : `On ${pkr(annual)} per year you pay ${pkr(tax.totalTax)} in tax — an effective rate of ${pct(tax.effectiveRate)}. Your marginal rate is ${pct(tax.marginalRate)}.`,
      sections: [
        {
          title: "Annual",
          lines: [
            { label: "Taxable income", value: pkr(annual) },
            { label: "Tax before surcharge", value: pkr(tax.baseTax) },
            ...(tax.surcharge > 0 ? [{ label: `Surcharge (${pct(kind === "salaried" ? year.surchargeRateSalaried : year.surchargeRateNonSalaried)} on tax, income > ${pkr(year.surchargeThreshold)})`, value: pkr(tax.surcharge) }] : []),
            { label: "Total annual tax", value: pkr(tax.totalTax), primary: true },
            { label: "Effective tax rate", value: pct(tax.effectiveRate), muted: true },
          ],
        },
        {
          title: "Monthly",
          lines: [
            { label: "Gross monthly", value: pkr(annual / 12) },
            { label: "Monthly tax", value: pkr(monthlyTax) },
            { label: "Take-home (before other deductions)", value: pkr(takeHomeMonthly), primary: true },
          ],
        },
        {
          title: `Your slab (${year.label})`,
          lines: [
            {
              label: tax.slab.upTo ? `${pkr(tax.slab.over)} – ${pkr(tax.slab.upTo)}` : `Above ${pkr(tax.slab.over)}`,
              value: tax.slab.fixed > 0 ? `${pkr(tax.slab.fixed)} + ${pct(tax.slab.rate)} of amount over ${pkr(tax.slab.over)}` : `${pct(tax.slab.rate)} of amount over ${pkr(tax.slab.over)}`,
              muted: true,
            },
          ],
        },
      ],
      warnings: kind === "salaried" ? ["Employers deduct this tax monthly under section 149. Tax credits (e.g. for charitable donations) and other income are not included here."] : ["Business individuals pay tax on net profit. Provincial taxes and minimum tax are not included."],
    };
  },
  methodology: `Pakistan taxes individual income in **progressive slabs**. Only the portion of income inside each slab is taxed at that slab's rate, so moving into a higher slab never reduces take-home pay.

For salaried individuals (where salary is more than 75% of total income) the Finance Act sets a separate, lower schedule than for business individuals.

**Formula:** *tax = fixed amount for your slab + rate × (taxable income − slab floor)*.

A **surcharge** applies to the tax amount when taxable income exceeds Rs 10 million.

This calculator uses annual taxable income; monthly amounts are simply divided by 12, which is how employers compute the monthly deduction under section 149 of the Income Tax Ordinance 2001.`,
  faqs: [
    { question: "Is income up to Rs 600,000 tax free?", answer: "Yes. The first Rs 600,000 of annual taxable income (Rs 50,000 per month) is exempt for both salaried and non-salaried individuals." },
    { question: "What counts as 'salaried'?", answer: "If your salary is more than 75% of your total taxable income, you are taxed under the salaried schedule, which has lower rates." },
    { question: "Does this include the surcharge?", answer: "Yes — where taxable income exceeds Rs 10 million, the surcharge on the tax amount is added." },
    { question: "Are provident fund or medical allowance deducted first?", answer: "Certain allowances and contributions are exempt or treated separately. This calculator taxes the figure you enter; enter your taxable salary for the most accurate result." },
    { question: "How often do the slabs change?", answer: "Usually every year in the Federal Budget (June), effective 1 July. Searchable updates this tool when the Finance Act is passed and shows the review date above." },
  ],
  related: {
    tools: ["salary-breakdown-calculator", "zakat-calculator"],
    guides: ["how-to-become-a-tax-filer-in-pakistan", "how-to-file-income-tax-return-pakistan"],
    entities: ["fbr"],
  },
};
