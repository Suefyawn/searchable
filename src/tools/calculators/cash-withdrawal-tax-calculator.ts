import { CASH_WITHDRAWAL_TAX } from "../data/payroll-and-levies";
import { num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const cashWithdrawalTaxCalculator: ToolDefinition = {
  slug: "cash-withdrawal-tax-calculator",
  category: "tax",
  name: "Cash Withdrawal Tax Calculator 2026-27",
  seoTitle: "Cash Withdrawal Tax Calculator Pakistan 2026-27: 0.8% Non-Filer Tax Above Rs 50,000 a Day (Section 231AB)",
  shortName: "Cash withdrawal tax",
  description: "See what the bank deducts when a non-filer withdraws cash: 0.8% once the day's withdrawals pass Rs 50,000, what filers pay (nothing), how much a month of withdrawals costs, and how splitting withdrawals across days changes it.",
  keywords: ["cash withdrawal tax", "cash withdrawal tax calculator", "231ab", "bank withdrawal tax non filer", "0.8% withholding tax", "atm withdrawal tax pakistan", "tax on cash withdrawal 50000", "non filer bank tax 2026", "withholding tax bank pakistan", "filer vs non filer bank"],
  version: "1.0.0",
  lastReviewed: CASH_WITHDRAWAL_TAX.reviewedAt,
  sources: [CASH_WITHDRAWAL_TAX.source],
  fields: [
    { key: "amount", label: "Cash withdrawn in one day", type: "number", unit: "PKR", default: 200_000, min: 0, step: 5000 },
    { key: "days", label: "Days like this per month", type: "number", default: 4, min: 1, max: 31, step: 1 },
    { key: "filer", label: "Filer status", type: "select", options: [{ value: "no", label: "Non-filer (not on the ATL)" }, { value: "yes", label: "Filer" }], default: "no" },
  ],
  compute(input) {
    const amount = Math.max(0, num(input, "amount", 0));
    const days = Math.max(1, Math.round(num(input, "days", 1)));
    const filer = str(input, "filer", "no") === "yes";
    const applies = !filer && amount > CASH_WITHDRAWAL_TAX.dailyThreshold;
    const tax = applies ? amount * CASH_WITHDRAWAL_TAX.rateNonFiler : 0;
    const monthly = tax * days;
    const splitDays = Math.ceil(amount / CASH_WITHDRAWAL_TAX.dailyThreshold);
    return {
      headline: { label: `Tax on ${pkr(amount)} withdrawn in a day`, value: pkr(Math.round(tax)), primary: true },
      summary: filer
        ? `Filers pay nothing under section 231AB, whatever the amount. Keep your name on the Active Taxpayer List by filing every year.`
        : applies
          ? `${pkr(amount)} is above the ${pkr(CASH_WITHDRAWAL_TAX.dailyThreshold)} daily threshold, so the bank deducts ${(CASH_WITHDRAWAL_TAX.rateNonFiler * 100).toFixed(1)}% on the full amount: ${pkr(Math.round(tax))}. ${days} such days a month is ${pkr(Math.round(monthly))} a month, ${pkr(Math.round(monthly * 12))} a year. Filing a return (which costs less than that for most people) would end it.`
          : `${pkr(amount)} is within the ${pkr(CASH_WITHDRAWAL_TAX.dailyThreshold)} a day threshold, so nothing is deducted.`,
      sections: [
        {
          lines: [
            { label: "Daily threshold", value: pkr(CASH_WITHDRAWAL_TAX.dailyThreshold) },
            { label: "Rate for non-filers", value: `${(CASH_WITHDRAWAL_TAX.rateNonFiler * 100).toFixed(1)}%` },
            { label: "Deducted today", value: pkr(Math.round(tax)), primary: true },
            { label: `Per month (${days} days)`, value: pkr(Math.round(monthly)) },
            { label: "Per year", value: pkr(Math.round(monthly * 12)), muted: true },
            ...(applies && splitDays > 1 ? [{ label: "Days needed to stay under the threshold", value: String(splitDays), note: `${pkr(CASH_WITHDRAWAL_TAX.dailyThreshold)} or less per day is not taxed` }] : []),
          ],
        },
      ],
      warnings: ["The deduction is adjustable: a non-filer who later files can claim it against tax due for that year. The threshold is per person per day across all withdrawals from that bank (counter, ATM and cheque encashment together). Cash withdrawals by federal and provincial governments, foreign diplomats and some exempt entities are outside 231AB."],
    };
  },
  methodology: `Section **231AB** of the Income Tax Ordinance requires every bank to deduct **advance adjustable tax** from a person **not appearing on the Active Taxpayer List** when the cash withdrawn in a single day **exceeds Rs 50,000**. The rate was 0.6% until 30 June 2025 and is **0.8%** from 1 July 2025 (Finance Act 2025), unchanged for 2026-27.

- The rate applies to the amount withdrawn once the day's total passes the threshold.
- Filers pay nothing.
- The deduction is credited against the year's tax if the person files a return.

The calculator multiplies one day's withdrawal by the rate and scales it by the number of such days you enter, and shows how many days it would take to withdraw the same cash tax-free.`,
  faqs: [
    { question: "Is the tax on the whole amount or only the part above Rs 50,000?", answer: "Banks apply it to the full amount withdrawn once the day's total crosses Rs 50,000, which is how the section is drafted. Rs 50,000 exactly is not taxed; Rs 50,001 is taxed in full." },
    { question: "Do filers pay cash withdrawal tax?", answer: "No. Being on the Active Taxpayer List removes the deduction entirely. Late filers pay it until their name appears on the list." },
    { question: "Does it apply to ATM withdrawals?", answer: "Yes, ATM, counter and cheque withdrawals from your account count together for the day." },
    { question: "Can I get it back?", answer: "Yes, if you file a return for that tax year; it is an advance tax, not a final one. Ask the bank for a tax deduction certificate or check FBR's portal." },
  ],
  related: { tools: ["income-tax-calculator", "freelancer-tax-calculator", "token-tax-calculator"], guides: ["how-to-become-a-filer-in-pakistan"], entities: ["fbr", "state-bank-of-pakistan"], businessCategories: ["tax-consultants", "bank-branches"] },
};
