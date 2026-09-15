import { IT_EXPORT_TAX } from "../data/payroll-and-levies";
import { num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const freelancerTaxCalculator: ToolDefinition = {
  slug: "freelancer-tax-calculator",
  category: "tax",
  name: "Freelancer Tax Calculator 2026-27",
  seoTitle: "Freelancer Tax Calculator Pakistan 2026-27: 0.25% PSEB Rate vs 1%, IT Export Income (Section 154A)",
  shortName: "Freelancer tax",
  description: "How much tax a Pakistani freelancer or IT exporter pays on foreign earnings: the 0.25% final tax with PSEB registration, 1% without, what the tax is in rupees on your monthly USD income, and what it takes to keep the rate.",
  keywords: ["freelancer tax calculator", "freelancer tax pakistan", "it export tax", "section 154a", "pseb tax 0.25", "upwork tax pakistan", "fiverr tax pakistan", "freelancer income tax 2026", "it exporter tax rate", "remittance tax freelancer"],
  version: "1.0.0",
  lastReviewed: IT_EXPORT_TAX.reviewedAt,
  sources: [IT_EXPORT_TAX.source, { title: "PSEB freelancer registration", publisher: "Pakistan Software Export Board", url: "https://www.pseb.org.pk" }],
  fields: [
    { key: "usd", label: "Foreign income per month", type: "number", unit: "USD", default: 2000, min: 0, step: 50 },
    { key: "rate", label: "Exchange rate", type: "number", unit: "PKR per USD", default: 277, min: 100, max: 500, step: 0.5, help: "Interbank rate your bank credits at. Live rate on the data hub." },
    { key: "pseb", label: "PSEB registration", type: "select", options: [{ value: "yes", label: "Registered with PSEB (0.25%)" }, { value: "no", label: "Not registered (1%)" }], default: "yes" },
    { key: "channel", label: "Share received through a Pakistani bank", type: "number", unit: "%", default: 100, min: 0, max: 100, step: 5, help: "Payoneer, Wise or Upwork to a Pakistani bank account count. Cash, crypto or foreign accounts do not." },
  ],
  compute(input) {
    const usd = Math.max(0, num(input, "usd", 0));
    const fx = Math.max(1, num(input, "rate", 277));
    const pseb = str(input, "pseb", "yes") === "yes";
    const channel = Math.min(100, Math.max(0, num(input, "channel", 100))) / 100;
    const monthly = usd * fx;
    const annual = monthly * 12;
    const rate = pseb ? IT_EXPORT_TAX.ratePseb : IT_EXPORT_TAX.rateNonPseb;
    const tax = annual * rate;
    const eligible = channel >= IT_EXPORT_TAX.bankingChannelShare;
    const otherRate = pseb ? IT_EXPORT_TAX.rateNonPseb : IT_EXPORT_TAX.ratePseb;
    const warnings: string[] = [];
    if (!eligible) warnings.push(`Only ${Math.round(channel * 100)}% of your proceeds come through approved banking channels. Below ${IT_EXPORT_TAX.bankingChannelShare * 100}% the concession does not apply and the income is taxed under the normal slabs; the figure above assumes you fix that.`);
    if (!pseb) warnings.push(`PSEB registration costs a few thousand rupees a year and cuts the rate to 0.25%: on this income that saves ${pkr(annual * (IT_EXPORT_TAX.rateNonPseb - IT_EXPORT_TAX.ratePseb))} a year.`);
    return {
      headline: { label: `Tax per year at ${(rate * 100).toFixed(2)}%`, value: pkr(Math.round(tax)), primary: true },
      summary: `${pkr(Math.round(monthly))} a month (${pkr(Math.round(annual))} a year) at ${(rate * 100).toFixed(2)}% is ${pkr(Math.round(tax / 12))} a month, deducted by the bank and final. That leaves ${pkr(Math.round(annual - tax))} a year. Under normal salary slabs the same income would carry far more tax, which is why the export regime exists.`,
      sections: [
        {
          title: "Your numbers",
          lines: [
            { label: "Income per year", value: pkr(Math.round(annual)) },
            { label: `Final tax (${(rate * 100).toFixed(2)}%)`, value: pkr(Math.round(tax)), primary: true },
            { label: "Per month", value: pkr(Math.round(tax / 12)), muted: true },
            { label: "Take-home per year", value: pkr(Math.round(annual - tax)) },
            { label: `If you were ${pseb ? "not registered (1%)" : "PSEB-registered (0.25%)"}`, value: pkr(Math.round(annual * otherRate)), muted: true },
          ],
        },
        {
          title: "Keeping the rate",
          lines: [
            { label: "Banking channel share required", value: `${IT_EXPORT_TAX.bankingChannelShare * 100}%`, note: eligible ? "You meet it." : "You do not meet it yet." },
            { label: "File the annual return", value: "Required", note: "The withholding becomes final only once the return and withholding statements are filed." },
            { label: "Concession runs until", value: "30 June 2029" },
          ],
        },
      ],
      warnings,
    };
  },
  methodology: `Freelancers and companies exporting software, IT services or IT-enabled services are taxed under **section 154A** of the Income Tax Ordinance: the bank that receives the foreign remittance deducts tax on the proceeds and that deduction is the **final tax**, so the income is not taxed again under the salary or business slabs.

- **0.25%** of proceeds for exporters **registered with PSEB** (Pakistan Software Export Board).
- **1%** for exporters who are not registered.
- The regime requires at least **80% of proceeds to arrive through approved banking channels** and an **annual return** to be filed; otherwise the income falls into the normal regime.
- Finance Act 2026 extended the concession to **tax year 2029**.

The calculator converts monthly USD at the rate you enter, applies the percentage to the annual total and shows the saving from PSEB registration. It does not cover local-currency income from Pakistani clients, which is taxed under the normal business slabs.`,
  faqs: [
    { question: "Is 0.25% the only tax a freelancer pays?", answer: "On export proceeds received through a bank, yes: it is a final tax. Income from local clients, rent, or a salary is taxed separately under the normal rules." },
    { question: "How do I register with PSEB?", answer: "Online at pseb.org.pk as a freelancer (CNIC, bank details, a platform profile) or as a company (SECP registration). The certificate is what the bank checks for the 0.25% rate." },
    { question: "Does Payoneer or Wise count as a banking channel?", answer: "Yes, when the money lands in your Pakistani bank account as a foreign remittance (PRC issued). Money kept abroad or withdrawn as cash outside Pakistan does not count." },
    { question: "Do I still need to file a return?", answer: "Yes. Without a filed return the withholding is treated as a minimum tax rather than a final one, and you lose filer status, which costs more on cars, property and bank withdrawals." },
  ],
  related: { tools: ["income-tax-calculator", "currency-converter", "cash-withdrawal-tax-calculator"], guides: ["fbr-iris-login-registration-and-filing-your-return"], entities: ["fbr", "pseb"], businessCategories: ["tax-consultants"] },
};
