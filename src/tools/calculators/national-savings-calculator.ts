import { NSC } from "../data/gas-savings";
import { num, str, type ToolDefinition } from "../types";
import { pct, pkr } from "@/lib/format";

type SchemeKey = keyof typeof NSC.schemes;

export const nationalSavingsCalculator: ToolDefinition = {
  slug: "national-savings-calculator",
  category: "finance",
  name: "National Savings Profit Calculator (Behbood, RIC, DSC)",
  seoTitle: "National Savings Profit Calculator 2026: Behbood, Regular Income, Defence Savings & Special Savings Certificates, Monthly Profit After Tax",
  shortName: "National Savings",
  description: "Monthly and yearly profit on National Savings certificates and accounts at the rates effective 18 July 2026, Behbood, Pensioners' Benefit, Regular Income, Defence Savings, Special Savings, after withholding tax for filers and non-filers.",
  keywords: ["national savings profit calculator", "behbood certificate profit calculator", "regular income certificate profit", "defence saving certificate calculator", "national savings rates 2026", "behbood profit rate", "ric profit rate", "national savings monthly profit", "qaumi bachat", "savings certificates pakistan"],
  version: "1.0.0",
  lastReviewed: NSC.reviewedAt,
  featured: true,
  sources: [NSC.source, { title: "Income Tax Ordinance 2001, s.151 (withholding on profit on debt)", publisher: "FBR" }],
  fields: [
    { key: "amount", label: "Amount invested", type: "number", unit: "PKR", default: 1_000_000, min: 100, step: 10_000 },
    {
      key: "scheme",
      label: "Scheme",
      type: "select",
      options: (Object.keys(NSC.schemes) as SchemeKey[]).map((k) => ({ value: k, label: `${NSC.schemes[k].name}: ${pct(NSC.schemes[k].rate, 2)}` })),
      default: "ric",
    },
    {
      key: "filer",
      label: "Tax status",
      type: "select",
      options: [
        { value: "filer", label: "Filer (15% withholding)" },
        { value: "nonfiler", label: "Non-filer (35% withholding)" },
      ],
      default: "filer",
    },
    { key: "years", label: "Years held (for totals)", type: "number", unit: "years", default: 5, min: 1, max: 10, step: 1 },
  ],
  compute(input) {
    const amount = Math.max(0, num(input, "amount"));
    const key = (str(input, "scheme", "ric") in NSC.schemes ? str(input, "scheme", "ric") : "ric") as SchemeKey;
    const sc = NSC.schemes[key];
    const filer = str(input, "filer", "filer") !== "nonfiler";
    const years = Math.max(1, Math.round(num(input, "years", 5)));
    const wht = sc.whtExempt ? 0 : filer ? NSC.withholding.filer : NSC.withholding.nonFiler;
    const warnings: string[] = [];
    if ("max" in sc && sc.max && amount > sc.max) warnings.push(`${sc.name} is capped at ${pkr(sc.max)} per person; the excess would need another scheme.`);
    if (amount < sc.min) warnings.push(`Minimum investment in ${sc.name} is ${pkr(sc.min)}.`);

    if (key === "dsc") {
      // Compounding to maturity; DSC pays at encashment with year-by-year tables, annual compounding approximates them.
      const maturity = amount * Math.pow(1 + sc.rate, years);
      const profit = maturity - amount;
      const tax = profit * wht;
      return {
        headline: { label: `Value after ${years} years`, value: pkr(maturity - tax), primary: true },
        summary: `${pkr(amount)} in Defence Savings Certificates grows to about ${pkr(maturity)} in ${years} years at ${pct(sc.rate, 2)} compounded, ${pkr(profit)} profit, ${pkr(tax)} withheld at encashment as a ${filer ? "filer" : "non-filer"}. Profit is not paid out until you encash.`,
        sections: [
          { title: "At encashment", lines: [{ label: "Invested", value: pkr(amount) }, { label: `Profit (${pct(sc.rate, 2)} compounded, ${years} years)`, value: pkr(profit) }, { label: `Withholding tax (${pct(wht)})`, value: `− ${pkr(tax)}` }, { label: "You receive", value: pkr(maturity - tax), primary: true }] },
          { title: "Growth", lines: Array.from({ length: Math.min(years, 10) }, (_, i) => ({ label: `After year ${i + 1}`, value: pkr(amount * Math.pow(1 + sc.rate, i + 1)), muted: true })) },
        ],
        warnings: [...warnings, "DSC profit follows the official 10-year table with rising annual rates; annual compounding is a close approximation. Encashing before 1 year pays no profit."],
      };
    }

    const yearly = amount * sc.rate;
    const periods = sc.payout === "monthly" ? 12 : sc.payout === "half-yearly" ? 2 : 1;
    const perPayout = yearly / periods;
    const taxPer = perPayout * wht;
    const netPer = perPayout - taxPer;
    return {
      headline: { label: sc.payout === "monthly" ? "Monthly profit after tax" : sc.payout === "half-yearly" ? "Half-yearly profit after tax" : "Profit at maturity after tax", value: pkr(netPer), primary: true },
      summary: `${pkr(amount)} in ${sc.name} earns ${pct(sc.rate, 2)} a year, ${pkr(yearly)} gross. ${sc.whtExempt ? "No withholding tax is deducted on this scheme." : `Withholding of ${pct(wht)} as a ${filer ? "filer" : "non-filer"} leaves ${pkr(yearly - yearly * wht)} a year`}, or ${pkr(netPer)} per ${sc.payout === "monthly" ? "month" : sc.payout === "half-yearly" ? "half-year" : "term"}. Over ${years} years: ${pkr((yearly - yearly * wht) * years)} net.`,
      sections: [
        {
          title: "Per payout",
          lines: [
            { label: `Gross profit per ${sc.payout === "monthly" ? "month" : sc.payout === "half-yearly" ? "half-year" : "term"}`, value: pkr(perPayout) },
            { label: sc.whtExempt ? "Withholding tax (exempt)" : `Withholding tax (${pct(wht)})`, value: `− ${pkr(taxPer)}` },
            { label: "Net paid to you", value: pkr(netPer), primary: true },
          ],
        },
        {
          title: "Over time",
          lines: [
            { label: "Net per year", value: pkr(yearly - yearly * wht) },
            { label: `Net over ${years} years`, value: pkr((yearly - yearly * wht) * years) },
            { label: "Principal returned at maturity / encashment", value: pkr(amount), muted: true },
          ],
        },
        { title: "Eligibility", lines: [{ label: sc.name, value: sc.who, muted: true }, { label: "Term", value: sc.term, muted: true }] },
      ],
      warnings: [...warnings, "Profit on National Savings is taxable income; the withholding is adjustable for filers. Rates are revised by the government every few months, the date above is when this tool was checked."],
    };
  },
  methodology: `National Savings (Qaumi Bachat) schemes pay fixed profit rates set by the Ministry of Finance, revised periodically with government bond yields. Rates effective **18 July 2026**:

| Scheme | Rate | Paid | Who |
|---|---|---|---|
| Behbood Savings Certificate | 12.96% | monthly | Seniors 60+, widows, persons with disabilities (max Rs 75 lakh) |
| Pensioners' Benefit Account | 12.96% | monthly | Retired government employees |
| Regular Income Certificate | 11.52% | monthly | Everyone |
| Short Term Savings Certificate | 11.12–11.17% | maturity | Everyone (3/6/12 months) |
| Special Savings Certificate | 11.2% (12.6% 6th) | half-yearly | Everyone |
| Sarwa Islamic Savings Account | 11.10% | monthly | Everyone |
| Defence Savings Certificate | 10.24% | at encashment, compounding | Everyone |
| Savings Account | 10.00% | half-yearly | Everyone |

**Tax:** profit on debt is withheld at 15% for filers and 35% for non-filers (s.151), adjustable against your income tax. Behbood and Pensioners' Benefit are exempt from withholding and taxed at a concessional rate for filers.`,
  faqs: [
    { question: "What is the Behbood certificate profit on 10 lakh?", answer: "At 12.96% a Rs 10 lakh Behbood investment pays Rs 10,800 a month with no withholding tax. It is only open to people aged 60+, widows and persons with disabilities, capped at Rs 75 lakh." },
    { question: "Which National Savings scheme pays the most?", answer: "Behbood, Pensioners' Benefit and Shuhada Family Welfare at 12.96%: but each is restricted to a group. For everyone else, Regular Income Certificates at 11.52% paid monthly are the highest general scheme." },
    { question: "Is National Savings profit taxable?", answer: "Yes. It counts as income; tax is withheld at source (15% filer / 35% non-filer) and adjusted when you file. Non-filers lose more than a third of their profit to withholding." },
    { question: "Can I withdraw early?", answer: "Certificates can be encashed early with a reduced rate or service charge depending on the scheme; Behbood and RIC charge a penalty in the first year. Savings accounts are withdrawable any time." },
  ],
  related: { tools: ["income-tax-calculator", "personal-loan-calculator", "zakat-calculator"], guides: ["how-to-become-a-tax-filer-in-pakistan"], entities: ["sbp"], businessCategories: ["banks"] },
};
