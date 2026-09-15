import { REFERENCE_RATES } from "../data/rates";
import { num, str, type ToolDefinition } from "../types";
import { pct, pkr } from "@/lib/format";

function emi(principal: number, annualRate: number, months: number): number {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export const personalLoanCalculator: ToolDefinition = {
  slug: "personal-loan-calculator",
  category: "finance",
  name: "Personal Loan Calculator Pakistan",
  seoTitle: "Personal Loan Calculator Pakistan 2026 — Monthly Instalment, Total Mark-up & Schedule (Bank Personal Loans, Salary Loans)",
  shortName: "Personal loan",
  description: "Monthly instalment and total mark-up on a personal or salary loan in Pakistan for any amount, rate and tenure, with the year-by-year balance so you can see how much is interest.",
  keywords: ["personal loan calculator pakistan", "loan calculator pakistan", "emi calculator pakistan", "instalment calculator", "bank loan calculator", "salary loan calculator", "hbl personal loan calculator", "ubl personal loan", "meezan personal finance", "loan markup calculator"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  sources: [{ title: "State Bank of Pakistan — KIBOR and consumer financing regulations", url: "https://www.sbp.org.pk/", publisher: "State Bank of Pakistan" }],
  fields: [
    { key: "amount", label: "Loan amount", type: "number", unit: "PKR", default: 1_000_000, min: 10_000, step: 10_000 },
    { key: "rate", label: "Annual mark-up rate", type: "number", unit: "%", default: Math.round((REFERENCE_RATES.kibor1y + 10) * 4) / 4, min: 1, max: 60, step: 0.25, help: "Unsecured personal loans are usually 1-year KIBOR + 8–14%; salary-transfer customers get the low end." },
    { key: "years", label: "Tenure", type: "select", options: [1, 2, 3, 4, 5].map((y) => ({ value: String(y), label: `${y} year${y > 1 ? "s" : ""}` })), default: "3" },
    { key: "processing", label: "Processing fee", type: "number", unit: "%", default: 1, min: 0, max: 5, step: 0.25, help: "Deducted upfront; typically 1–2% plus FED." },
  ],
  compute(input) {
    const amount = Math.max(0, num(input, "amount"));
    const rate = num(input, "rate", 21);
    const months = Math.max(1, parseInt(str(input, "years", "3"), 10) || 3) * 12;
    const fee = amount * (num(input, "processing", 1) / 100);
    const m = emi(amount, rate, months);
    const total = m * months;
    const markup = total - amount;
    // Year-by-year balance
    let bal = amount;
    const years: { label: string; value: string; muted?: boolean }[] = [];
    for (let y = 1; y <= months / 12; y++) {
      let interestY = 0;
      for (let i = 0; i < 12; i++) {
        const intr = bal * (rate / 100 / 12);
        interestY += intr;
        bal -= m - intr;
      }
      years.push({ label: `After year ${y}`, value: `${pkr(Math.max(0, bal))} left · ${pkr(interestY)} mark-up paid`, muted: true });
    }
    return {
      headline: { label: "Monthly instalment", value: pkr(m), primary: true },
      summary: `Borrowing ${pkr(amount)} at ${pct(rate / 100)} over ${months / 12} years costs ${pkr(m)} a month. You repay ${pkr(total)} in total — ${pkr(markup)} in mark-up${fee ? ` plus ${pkr(fee)} processing fee` : ""}. Effective cost: ${pct((markup + fee) / amount)} of the amount borrowed.`,
      sections: [
        {
          title: "Cost of the loan",
          lines: [
            { label: "Amount borrowed", value: pkr(amount) },
            { label: `Total mark-up (${pct(rate / 100)} p.a.)`, value: pkr(markup) },
            ...(fee ? [{ label: "Processing fee (upfront)", value: pkr(fee) }] : []),
            { label: "Total repaid", value: pkr(total + fee), primary: true },
            { label: "Net cash you receive", value: pkr(amount - fee), muted: true },
          ],
        },
        { title: "Balance over time", lines: years },
      ],
      warnings: ["Banks price personal loans on KIBOR plus a spread and may reprice annually; the instalment can rise if KIBOR does. Late-payment charges and life insurance are extra."],
    };
  },
  methodology: `Instalment = P × r ÷ (1 − (1 + r)^−n), where P is the amount, r the monthly rate (annual ÷ 12) and n the number of months — the standard reducing-balance formula used by Pakistani banks for personal, salary and Islamic personal finance (where the "profit rate" plays the same role).

Unsecured personal loans in 2026 are priced at 1-year KIBOR (~${REFERENCE_RATES.kibor1y}%) plus 8–14% depending on employer category and salary-transfer status, with a 1–2% processing fee plus FED deducted upfront. The year-by-year table shows how mark-up front-loads: most of the early instalments are interest.`,
  faqs: [
    { question: "What is the personal loan interest rate in Pakistan?", answer: "Typically 18–28% per year in 2026 — 1-year KIBOR plus the bank's spread, lower for salaried employees of approved companies and for customers who transfer their salary account." },
    { question: "How much personal loan can I get?", answer: "Banks usually lend up to 10–20 times net monthly salary, capped by SBP's debt-burden rule that total instalments stay under about 50% of net income." },
    { question: "Is early repayment allowed?", answer: "Yes, usually with a 2–5% early settlement charge on the outstanding balance; some banks waive it after half the tenure." },
    { question: "Islamic personal finance — is it the same calculation?", answer: "The instalment maths is the same; the structure is a sale (murabaha) or service (ijarah/tawarruq) with a fixed profit rate instead of interest." },
  ],
  related: { tools: ["car-loan-calculator", "home-loan-calculator", "salary-breakdown-calculator"], guides: ["how-to-open-a-roshan-digital-account"], entities: ["sbp", "hbl", "meezan-bank"], businessCategories: ["banks"] },
};
