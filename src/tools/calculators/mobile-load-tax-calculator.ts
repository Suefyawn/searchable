import { MOBILE_LOAD_TAX } from "../data/payroll-and-levies";
import { num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const mobileLoadTaxCalculator: ToolDefinition = {
  slug: "mobile-load-tax-calculator",
  category: "telecom",
  name: "Mobile Load Tax Calculator",
  seoTitle: "Mobile Load Tax Calculator 2026: Balance You Get on Rs 100, 500, 1000 Recharge (Jazz, Zong, Telenor, Ufone)",
  shortName: "Mobile load tax",
  description: "How much balance you actually get when you load Rs 100, 500 or 1,000 on Jazz, Zong, Telenor or Ufone: the 15% advance income tax taken at recharge, the sales tax taken when you use it, and how much of the tax a filer can claim back.",
  keywords: ["mobile load tax calculator", "load tax", "rs 100 load balance", "mobile balance tax", "jazz load tax", "zong load tax", "telenor load tax", "ufone load tax", "advance tax on mobile", "tax on easyload 2026", "how much balance on 100 rupees load"],
  version: "1.0.0",
  lastReviewed: MOBILE_LOAD_TAX.reviewedAt,
  sources: [MOBILE_LOAD_TAX.source],
  fields: [
    { key: "amount", label: "Recharge amount", type: "number", unit: "PKR", default: 100, min: 1, max: 100_000, step: 10 },
    { key: "region", label: "Where the SIM is registered", type: "select", options: [{ value: "province", label: "Punjab, Sindh, KP or Balochistan (19.5% sales tax)" }, { value: "ict", label: "Islamabad (18.5% FED)" }], default: "province" },
    { key: "filer", label: "Are you a tax filer?", type: "select", options: [{ value: "yes", label: "Yes, on the Active Taxpayer List" }, { value: "no", label: "No" }], default: "no" },
  ],
  compute(input) {
    const amount = Math.max(0, num(input, "amount", 100));
    const region = str(input, "region", "province");
    const filer = str(input, "filer", "no") === "yes";
    const salesTax = region === "ict" ? MOBILE_LOAD_TAX.salesTaxIct : MOBILE_LOAD_TAX.salesTaxOnUse;
    // Advance tax is 15% of the balance credited, so the balance is the recharge ÷ 1.15.
    const balance = amount / (1 + MOBILE_LOAD_TAX.advanceTax);
    const advance = amount - balance;
    // Sales tax comes off as the balance is spent on calls and data.
    const usable = balance / (1 + salesTax);
    const sales = balance - usable;
    const totalTax = advance + sales;
    // Paise matter on a Rs 100 load; whole rupees are fine on a Rs 5,000 one.
    const fmt = (v: number) => (amount < 1000 ? `Rs ${v.toFixed(2)}` : pkr(Math.round(v)));
    return {
      headline: { label: `Balance on a ${pkr(amount)} recharge`, value: fmt(balance), primary: true },
      summary: `The network keeps ${fmt(advance)} (15% advance income tax) and credits ${fmt(balance)}. As you use it, ${(salesTax * 100).toFixed(1)}% sales tax takes another ${fmt(sales)}, so about ${fmt(usable)} of the ${pkr(amount)} buys calls and data: ${((totalTax / amount) * 100).toFixed(1)}% goes in tax. ${filer ? "As a filer, the advance tax is adjustable: claim it in your return against your tax due." : "Non-filers cannot claim the advance tax back; it is money gone."}`,
      sections: [
        {
          lines: [
            { label: "Recharge", value: pkr(amount) },
            { label: "Advance income tax (15% of balance)", value: fmt(advance) },
            { label: "Balance credited", value: fmt(balance), primary: true },
            { label: `Sales tax on use (${(salesTax * 100).toFixed(1)}%)`, value: fmt(sales) },
            { label: "Worth of calls and data", value: fmt(usable) },
            { label: "Total tax share", value: `${((totalTax / amount) * 100).toFixed(1)}%`, muted: true },
            { label: filer ? "Claimable in your return" : "Claimable", value: filer ? fmt(advance) : "Nothing (non-filer)", muted: true },
          ],
        },
      ],
      warnings: ["Bundles and packages are priced with sales tax inside, so the second deduction shows up as the package costing more balance than its face price rather than as a separate line. Figures use the statutory rates; a few networks round to the nearest rupee."],
    };
  },
  methodology: `Two taxes sit on prepaid mobile spending:

1. **Advance income tax under section 236** of the Income Tax Ordinance, collected by the network at recharge at **15% of the amount of the bill or sales price**. Because the 15% is charged on the balance you receive, a Rs 100 recharge credits Rs 100 ÷ 1.15 = **Rs 86.96** and the tax is Rs 13.04 (which is why you may also read "13% load tax"). It is **adjustable**: filers set it against their annual tax; for non-filers it is effectively final.
2. **Sales tax on telecom services**, a provincial tax at **19.5%** in Punjab, Sindh, KP and Balochistan (federal excise at 18.5% in Islamabad), charged when the balance is used.

The calculator applies both to show what a recharge is really worth. Postpaid bills carry the same taxes as line items.`,
  faqs: [
    { question: "Why do I get Rs 86.96 on a Rs 100 load and not Rs 85?", answer: "Because the 15% is calculated on the balance credited, not on the Rs 100: 86.96 × 15% = 13.04, and 86.96 + 13.04 = 100." },
    { question: "Can I get the mobile tax back?", answer: "If you file a return, the advance tax on your mobile number is adjustable against your tax due (the networks issue certificates and FBR's portal shows the amounts). Non-filers cannot claim it." },
    { question: "Is the tax the same on Jazz, Zong, Telenor and Ufone?", answer: "Yes. Both taxes are set by law, not by the operator. Differences of a rupee come from rounding." },
    { question: "Is there tax on internet packages too?", answer: "Yes, the same sales tax on services applies to data; Punjab and some provinces have at times exempted or reduced it for data only. The advance tax is charged on the recharge regardless of what you buy with it." },
  ],
  related: { tools: ["pta-mobile-tax-calculator", "income-tax-calculator", "sales-tax-calculator"], guides: ["pta-mobile-registration"], entities: ["pta", "fbr"] },
  hubUrl: "/pta",
};
