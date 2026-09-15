import { num, type ToolDefinition } from "../types";
import { pct, pkr } from "@/lib/format";

export const providentFundCalculator: ToolDefinition = {
  slug: "provident-fund-calculator",
  category: "finance",
  name: "Provident Fund Calculator",
  seoTitle: "Provident Fund Calculator Pakistan: PF Balance at Retirement with Employer Match, Profit Rate & Salary Growth",
  shortName: "Provident fund",
  description: "Project your provident fund: monthly employee and employer contributions on basic salary, the fund's profit rate and annual raises, to see the lump sum at leaving or retirement year by year.",
  keywords: ["provident fund calculator", "pf calculator pakistan", "provident fund calculation", "gp fund calculator", "cp fund calculator", "employer contribution provident fund", "provident fund rules pakistan", "pf withdrawal", "retirement fund calculator pakistan"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  sources: [{ title: "Provident Funds Act 1925; Income Tax Ordinance 2001 Sixth Schedule Part I (recognised provident funds)", publisher: "Government of Pakistan / FBR" }],
  fields: [
    { key: "basic", label: "Basic salary (monthly)", type: "number", unit: "PKR", default: 100_000, min: 0, step: 1000, help: "PF is usually a percentage of basic, not gross." },
    { key: "employeePct", label: "Your contribution", type: "number", unit: "% of basic", default: 8.33, min: 0, max: 30, step: 0.01, help: "8.33% (one-twelfth) and 10% are the common rates." },
    { key: "employerPct", label: "Employer contribution", type: "number", unit: "% of basic", default: 8.33, min: 0, max: 30, step: 0.01, help: "Usually matches yours; tax-exempt up to 10% of salary (Sixth Schedule)." },
    { key: "profit", label: "Fund profit rate", type: "number", unit: "% per year", default: 11, min: 0, max: 30, step: 0.25, help: "Trust-managed funds mostly hold government paper; 10–13% in 2026." },
    { key: "raise", label: "Annual salary increase", type: "number", unit: "%", default: 8, min: 0, max: 50, step: 0.5 },
    { key: "years", label: "Years", type: "number", unit: "years", default: 10, min: 1, max: 40, step: 1 },
    { key: "opening", label: "Current PF balance", type: "number", unit: "PKR", default: 0, min: 0, step: 10_000 },
  ],
  compute(input) {
    const basic0 = Math.max(0, num(input, "basic"));
    const ep = num(input, "employeePct", 8.33) / 100;
    const rp = num(input, "employerPct", 8.33) / 100;
    const r = num(input, "profit", 11) / 100;
    const raise = num(input, "raise", 8) / 100;
    const years = Math.max(1, Math.round(num(input, "years", 10)));
    let bal = Math.max(0, num(input, "opening", 0));
    let mine = 0;
    let theirs = 0;
    const rows: { label: string; value: string; muted?: boolean }[] = [];
    let basic = basic0;
    for (let y = 1; y <= years; y++) {
      for (let m = 0; m < 12; m++) {
        const c1 = basic * ep;
        const c2 = basic * rp;
        mine += c1;
        theirs += c2;
        bal = (bal + c1 + c2) * (1 + r / 12);
      }
      if (y <= 10 || y === years) rows.push({ label: `End of year ${y}`, value: pkr(bal), muted: true });
      basic *= 1 + raise;
    }
    const profit = bal - mine - theirs - Math.max(0, num(input, "opening", 0));
    return {
      headline: { label: `Provident fund after ${years} years`, value: pkr(bal), primary: true },
      summary: `Contributing ${pct(ep, 2)} of a ${pkr(basic0)} basic (${pkr(basic0 * ep)} a month) with a ${pct(rp, 2)} employer match, growing ${pct(raise)} a year and earning ${pct(r)} on the fund, you would have about ${pkr(bal)}, of which ${pkr(mine)} is your money, ${pkr(theirs)} the employer's and ${pkr(profit)} profit.`,
      sections: [
        {
          title: "Where it comes from",
          lines: [
            { label: "Your contributions", value: pkr(mine) },
            { label: "Employer contributions", value: pkr(theirs) },
            { label: "Profit earned", value: pkr(profit) },
            { label: "Balance", value: pkr(bal), primary: true },
            { label: "First-year monthly deduction from salary", value: pkr(basic0 * ep), muted: true },
          ],
        },
        { title: "Year by year", lines: rows },
      ],
      warnings: ["Employer contributions usually vest fully only after a service period set in the fund rules (often 3–5 years); leaving earlier can forfeit part of the employer share.", "Withdrawal from a recognised provident fund at retirement or after the qualifying service is tax-free; unrecognised funds and early withdrawals may be taxed."],
    };
  },
  methodology: `Each month both contributions (a percentage of **basic** salary) are added to the balance, which then earns the fund's profit rate compounded monthly. Salary rises once a year by the increase you enter. The year-by-year table shows the closing balance.

Under the **Sixth Schedule** of the Income Tax Ordinance, an employer's contribution to a recognised provident fund is exempt from tax up to one-tenth of salary (or Rs 150,000 a year, whichever is less), and the accumulated balance is exempt on payment at retirement or leaving after the qualifying period. Government employees' GP Fund earns a rate notified by the Finance Division each year.`,
  faqs: [
    { question: "What percentage is provident fund in Pakistan?", answer: "Commonly 8.33% or 10% of basic salary from the employee, matched by the employer; the law does not fix a rate for private employers, the fund's trust deed does." },
    { question: "Is provident fund withdrawal taxable?", answer: "Payment from a recognised provident fund at retirement, or after the service period in the rules, is exempt. Withdrawing the employer share early or from an unrecognised fund can be taxed as salary." },
    { question: "Can I take a loan from my PF?", answer: "Most fund rules allow a loan or partial withdrawal for house purchase, marriage, medical or education, repayable in instalments." },
  ],
  related: { tools: ["eobi-calculator", "salary-breakdown-calculator", "national-savings-calculator"], guides: [], entities: ["fbr", "eobi"], businessCategories: ["tax-consultants"] },
};
