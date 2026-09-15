import { EOBI } from "../data/vehicle-tax";
import { num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const eobiCalculator: ToolDefinition = {
  slug: "eobi-calculator",
  category: "finance",
  name: "EOBI Contribution Calculator 2026-27",
  seoTitle: "EOBI Contribution Calculator 2026-27 — Employer 5% & Employee 1% on Minimum Wage Rs 40,700, Monthly and Annual",
  shortName: "EOBI",
  description: "Work out EOBI contributions for one employee or a whole payroll: employer 5% and employee 1% of the federal minimum wage (Rs 40,700 from July 2026), monthly and per year, plus who must register and when pension starts.",
  keywords: ["eobi calculator", "eobi contribution", "eobi contribution rate 2026", "eobi employer contribution", "eobi employee contribution", "eobi minimum wage", "eobi pension", "eobi registration", "minimum wage pakistan 2026", "payroll pakistan"],
  version: "1.0.0",
  lastReviewed: EOBI.reviewedAt,
  sources: [EOBI.source, { title: "Employees' Old-Age Benefits Act 1976, ss.9 and 9B", publisher: "EOBI" }],
  fields: [
    { key: "employees", label: "Number of employees", type: "number", default: 10, min: 1, max: 100_000, step: 1 },
    { key: "wage", label: "Minimum wage used for EOBI", type: "number", unit: "PKR / month", default: EOBI.minimumWage, min: 1000, step: 100, help: "Contributions are on the federal minimum wage, not on actual salary. Rs 40,700 from 1 July 2026." },
    {
      key: "who",
      label: "Show",
      type: "select",
      options: [
        { value: "both", label: "Employer and employee share" },
        { value: "employer", label: "Employer share only" },
      ],
      default: "both",
    },
  ],
  compute(input) {
    const n = Math.max(1, Math.round(num(input, "employees", 1)));
    const wage = Math.max(0, num(input, "wage", EOBI.minimumWage));
    const who = str(input, "who", "both");
    const employer = Math.round(wage * EOBI.employerRate);
    const employee = Math.round(wage * EOBI.employeeRate);
    const perHead = who === "employer" ? employer : employer + employee;
    const monthly = perHead * n;
    return {
      headline: { label: `EOBI per month for ${n} employee${n > 1 ? "s" : ""}`, value: pkr(monthly), primary: true },
      summary: `Per employee: employer ${pkr(employer)} (5%) and employee ${pkr(employee)} (1%) of the ${pkr(wage)} minimum wage — ${pkr(employer + employee)} a month, ${pkr((employer + employee) * 12)} a year. ${n >= EOBI.employeeThreshold ? "With 5 or more employees, registration is mandatory." : "Registration becomes mandatory at 5 employees; voluntary before that."}`,
      sections: [
        {
          title: "Per employee",
          lines: [
            { label: "Employer share (5%)", value: pkr(employer) },
            { label: "Employee share (1%, deducted from salary)", value: pkr(employee) },
            { label: "Total per employee per month", value: pkr(employer + employee) },
            { label: "Per employee per year", value: pkr((employer + employee) * 12), muted: true },
          ],
        },
        {
          title: `Payroll (${n})`,
          lines: [
            { label: "Employer cost per month", value: pkr(employer * n) },
            { label: "Employee deductions per month", value: pkr(employee * n) },
            { label: "Total deposited per month", value: pkr((employer + employee) * n), primary: true },
            { label: "Total per year", value: pkr((employer + employee) * n * 12), muted: true },
          ],
        },
      ],
      warnings: ["EOBI is due on the notified minimum wage regardless of actual salary; provinces with a higher minimum wage do not change the EOBI base unless EOBI notifies it. Pay by the 15th of the following month to avoid penalties."],
    };
  },
  methodology: `EOBI (Employees' Old-Age Benefits Institution) is the federal pension scheme for private-sector workers. Under the EOB Act 1976:

- **Employer contribution: 5%** of the minimum wage per insured employee per month (s.9).
- **Employee contribution: 1%** of the minimum wage, deducted from salary (s.9B).
- The base is the **federal minimum wage** — Rs ${EOBI.minimumWage.toLocaleString()} from 1 July 2026 under Finance Act 2026 — **not** the employee's actual pay.
- Employers with **${EOBI.employeeThreshold} or more employees** must register (many register earlier voluntarily so staff accrue service).
- Pension is payable at **60 (men) / 55 (women)** after at least **15 years** of insurable service, at a minimum monthly pension set by the government; invalidity and survivors' pensions also exist.

Contributions are paid monthly through EOBI's online portal (Facilitation System) by bank challan.`,
  faqs: [
    { question: "Is EOBI calculated on actual salary?", answer: "No. Both shares are percentages of the notified federal minimum wage, so a Rs 300,000 manager and a Rs 40,700 helper cost the employer the same EOBI." },
    { question: "Who has to register with EOBI?", answer: "Any industrial or commercial establishment with five or more employees. Employers with fewer can register voluntarily." },
    { question: "How much pension does EOBI pay?", answer: "A minimum monthly pension fixed by the government (revised in recent budgets) after 15 years of insurable service, from 60 for men and 55 for women. The formula is based on years of service and the wage on which contributions were paid." },
    { question: "Can the employer deduct its 5% from my salary?", answer: "No. Only the 1% employee share may be deducted; the 5% is the employer's own cost. Deducting more is an offence under the Act." },
  ],
  related: { tools: ["salary-breakdown-calculator", "income-tax-calculator"], guides: ["how-to-register-a-company-with-secp"], entities: ["eobi"], businessCategories: ["tax-consultants"] },
};
