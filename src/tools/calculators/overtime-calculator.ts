import { OVERTIME } from "../data/payroll-and-levies";
import { num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const overtimeCalculator: ToolDefinition = {
  slug: "overtime-calculator",
  category: "finance",
  name: "Overtime Pay Calculator Pakistan",
  seoTitle: "Overtime Calculator Pakistan 2026: Double Rate Formula, Hourly Rate from Monthly Salary (Factories Act)",
  shortName: "Overtime",
  description: "Turn a monthly salary into an hourly rate and work out overtime at double pay for the extra hours in a week or month, as the Factories Act and the Shops and Establishments Ordinance require.",
  keywords: ["overtime calculator", "overtime calculator pakistan", "overtime rate pakistan", "double overtime", "overtime formula", "hourly rate from monthly salary", "factories act overtime", "labour law overtime pakistan", "overtime pay 2026", "working hours pakistan"],
  version: "1.0.0",
  lastReviewed: OVERTIME.reviewedAt,
  sources: [OVERTIME.source],
  fields: [
    { key: "wage", label: "Monthly wage", type: "number", unit: "PKR", default: 50_000, min: 0, step: 500, help: "Basic plus dearness allowance; the rate the law doubles." },
    { key: "hours", label: "Overtime hours", type: "number", default: 20, min: 0, max: 400, step: 1 },
    { key: "period", label: "Over", type: "select", options: [{ value: "month", label: "a month" }, { value: "week", label: "a week" }], default: "month" },
    { key: "shift", label: "Ordinary daily hours", type: "number", default: 8, min: 6, max: 9, step: 1, help: "8 in a six-day week, up to 9 where the week is shorter." },
  ],
  compute(input) {
    const wage = Math.max(0, num(input, "wage", 0));
    const hours = Math.max(0, num(input, "hours", 0));
    const period = str(input, "period", "month");
    const shift = Math.min(9, Math.max(6, num(input, "shift", 8)));
    const daily = wage / OVERTIME.daysPerMonth;
    const hourly = daily / shift;
    const otRate = hourly * OVERTIME.multiplier;
    const pay = otRate * hours;
    const monthlyHours = period === "week" ? hours * 52 / 12 : hours;
    const warnings: string[] = [];
    if (period === "week" && hours > 12) warnings.push(`${hours} hours of overtime a week takes you past the legal ceiling (roughly ${OVERTIME.weeklyHours + 12} hours including overtime in most notified limits). The employer needs an exemption for that.`);
    if (period === "month" && monthlyHours > 52) warnings.push(`Over ${Math.round(monthlyHours)} overtime hours a month is above the usual ceiling; check the factory's overtime exemption.`);
    return {
      headline: { label: `Overtime pay for ${hours} hour${hours === 1 ? "" : "s"} (${period === "week" ? "week" : "month"})`, value: pkr(Math.round(pay)), primary: true },
      summary: `${pkr(wage)} ÷ ${OVERTIME.daysPerMonth} days ÷ ${shift} hours is ${pkr(Math.round(hourly))} an hour. Overtime is paid at ${OVERTIME.multiplier}×, ${pkr(Math.round(otRate))} an hour, so ${hours} hours earn ${pkr(Math.round(pay))}${period === "week" ? `, about ${pkr(Math.round(pay * 52 / 12))} a month at that pace` : ""}.`,
      sections: [
        {
          lines: [
            { label: "Daily wage (÷ 26)", value: pkr(Math.round(daily)) },
            { label: "Hourly rate", value: pkr(Math.round(hourly)) },
            { label: `Overtime rate (${OVERTIME.multiplier}×)`, value: pkr(Math.round(otRate)) },
            { label: "Overtime pay", value: pkr(Math.round(pay)), primary: true },
            { label: "Pay including ordinary wage (month)", value: pkr(Math.round(wage + (period === "week" ? pay * 52 / 12 : pay))), muted: true },
          ],
        },
      ],
      warnings,
    };
  },
  methodology: `Section 47 of the **Factories Act 1934** and the provincial **Shops and Establishments Ordinances** entitle a worker who works beyond the ordinary hours (48 a week, 8 or 9 a day) to overtime at **twice the ordinary rate of pay**, including dearness allowance.

The hourly rate is derived the way labour courts and departments do it:
- Daily wage = monthly wage ÷ **26** (a month of working days).
- Hourly wage = daily wage ÷ ordinary daily hours (8 or 9).
- Overtime = hourly wage × **2** × overtime hours.

Limits: total hours including overtime are capped (commonly 60 a week, 12 a day) unless the factory holds an exemption; these limits, and stricter ones for women and young workers, are enforced by the provincial labour department.`,
  faqs: [
    { question: "Is overtime always double?", answer: "For workers covered by the Factories Act and the Shops and Establishments Ordinances, yes. Managerial and supervisory staff on a monthly salary above the workman definition are generally outside these rules, and their contracts govern." },
    { question: "Why divide by 26 and not 30?", answer: "Because 26 is the number of working days in a month with weekly rest days; dividing by 30 understates the daily rate and is a common source of underpayment claims." },
    { question: "Does overtime include allowances?", answer: "Basic pay and dearness allowance are doubled. Bonus, conveyance and house rent are not part of the ordinary rate." },
    { question: "What can I do if overtime is not paid?", answer: "Write to the employer first, then file with the labour inspector or labour court in your district. Claims can go back to the period the law allows; keep attendance records or gate passes." },
  ],
  related: { tools: ["salary-breakdown-calculator", "gratuity-calculator", "eobi-calculator"], businessCategories: ["lawyers"] },
};
