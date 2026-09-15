import { GRATUITY } from "../data/payroll-and-levies";
import { num, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const gratuityCalculator: ToolDefinition = {
  slug: "gratuity-calculator",
  category: "finance",
  name: "Gratuity Calculator Pakistan",
  seoTitle: "Gratuity Calculator Pakistan 2026: 30 Days' Wages Per Year of Service, Standing Orders Formula",
  shortName: "Gratuity",
  description: "Work out the gratuity you are owed when you leave a job in Pakistan: 30 days of your last drawn wages for every completed year of service, with six months or more counting as a full year, under the Standing Orders Ordinance.",
  keywords: ["gratuity calculator", "gratuity calculator pakistan", "gratuity formula pakistan", "gratuity calculation", "end of service benefits pakistan", "gratuity law pakistan", "30 days gratuity", "gratuity on resignation", "gratuity rules 2026", "standing orders ordinance gratuity"],
  version: "1.0.0",
  lastReviewed: GRATUITY.reviewedAt,
  sources: [GRATUITY.source],
  fields: [
    { key: "wage", label: "Last drawn monthly wage", type: "number", unit: "PKR", default: 80_000, min: 0, step: 1000, help: "Basic pay plus dearness and cost-of-living allowances. Bonuses and overtime are excluded." },
    { key: "years", label: "Completed years of service", type: "number", default: 5, min: 0, max: 50, step: 1 },
    { key: "months", label: "Extra months beyond that", type: "number", default: 7, min: 0, max: 11, step: 1, help: "Six months or more count as a full year." },
  ],
  compute(input) {
    const wage = Math.max(0, num(input, "wage", 0));
    const years = Math.max(0, Math.floor(num(input, "years", 0)));
    const months = Math.min(11, Math.max(0, Math.floor(num(input, "months", 0))));
    const totalMonths = years * 12 + months;
    const countedYears = years + (months >= GRATUITY.roundUpMonths ? 1 : 0);
    const daily = wage / 30;
    const perYear = daily * GRATUITY.daysPerYear;
    const eligible = totalMonths >= GRATUITY.minServiceMonths;
    const gratuity = eligible ? perYear * countedYears : 0;
    return {
      headline: { label: eligible ? `Gratuity for ${countedYears} year${countedYears === 1 ? "" : "s"}` : "Gratuity", value: eligible ? pkr(Math.round(gratuity)) : "Not yet due", primary: true },
      summary: eligible
        ? `${GRATUITY.daysPerYear} days of ${pkr(wage)} is ${pkr(Math.round(perYear))} per year of service. ${years} year${years === 1 ? "" : "s"} and ${months} month${months === 1 ? "" : "s"} count as ${countedYears} year${countedYears === 1 ? "" : "s"}, so ${pkr(Math.round(gratuity))}. That is ${(countedYears).toFixed(0)} month${countedYears === 1 ? "" : "s"} of pay.`
        : `Gratuity is payable after ${GRATUITY.minServiceMonths} months of continuous service; you have ${totalMonths}.`,
      sections: [
        {
          lines: [
            { label: "Daily wage (monthly ÷ 30)", value: pkr(Math.round(daily)) },
            { label: `Per year of service (${GRATUITY.daysPerYear} days)`, value: pkr(Math.round(perYear)) },
            { label: "Years counted", value: String(countedYears), note: months >= GRATUITY.roundUpMonths && months > 0 ? `${months} months rounded up to a year` : months > 0 ? `${months} months not counted (under six)` : undefined },
            { label: "Gratuity", value: pkr(Math.round(gratuity)), primary: true },
          ],
        },
      ],
      warnings: ["Employers with an approved provident fund or pension scheme may pay one of the two instead of gratuity; check your appointment letter. Gratuity received on retirement or termination is tax-exempt up to the limits in the Second Schedule, and a properly constituted gratuity fund is exempt in full."],
    };
  },
  methodology: `Under **Standing Order 12(6)** of the Industrial and Commercial Employment (Standing Orders) Ordinance 1968 (and the near-identical Sindh Act of 2015), a workman whose service is ended by the employer, or who resigns after continuous service, is paid gratuity of **30 days' wages for every completed year of service or any part in excess of six months**, based on the **last drawn wages**.

- Daily wage = monthly wage ÷ 30.
- Gratuity = daily wage × 30 × counted years, where a final part-year of six months or more counts as one.
- Wages means basic pay plus dearness and cost-of-living allowances; bonus, overtime and travelling allowance are excluded.
- The employer may instead maintain a provident fund or pension scheme with contributions at least equal to gratuity; it cannot skip both.

Contract, daily-wage and piece-rate workers qualify once service is continuous for a year. Government service and some sectors (banking under separate rules) differ.`,
  faqs: [
    { question: "Do I get gratuity if I resign?", answer: "Yes. Resignation after at least a year of continuous service qualifies; dismissal for misconduct is the exception the law allows." },
    { question: "Is gratuity calculated on gross or basic salary?", answer: "On wages as defined in the Ordinance: basic plus dearness and cost-of-living allowances, at the last drawn rate. House rent, conveyance, bonus and overtime are not part of it." },
    { question: "Is gratuity taxable?", answer: "Gratuity from an approved fund is exempt. From an unapproved scheme, exemption is limited (the lower of a fixed cap and 50% of the amount) under the Second Schedule; the rest is added to salary income." },
    { question: "Can the employer pay provident fund instead of gratuity?", answer: "Yes, if the fund is approved and the employer's contribution is not less than the gratuity would be. Many companies run both; the law requires one." },
  ],
  related: { tools: ["provident-fund-calculator", "salary-breakdown-calculator", "eobi-calculator", "income-tax-calculator"], entities: ["eobi"], businessCategories: ["lawyers", "tax-consultants"] },
};
