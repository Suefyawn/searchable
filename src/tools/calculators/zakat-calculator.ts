import { REFERENCE_RATES, ZAKAT } from "../data/rates";
import { num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const zakatCalculator: ToolDefinition = {
  slug: "zakat-calculator",
  category: "finance",
  name: "Zakat Calculator 2026",
  seoTitle: "Zakat Calculator 2026 — Zakat on Gold, Cash & Savings with Today’s Nisab in Pakistan",
  shortName: "Zakat",
  description: "Calculate zakat on gold, silver, cash, savings and investments using today’s nisab in Pakistani rupees. Choose the silver or gold nisab and see exactly what is due.",
  keywords: ["zakat calculator", "zakat calculator pakistan", "zakat on gold", "nisab 2026", "nisab in pakistan", "zakat on savings", "zakat on cash", "how to calculate zakat", "zakat percentage", "nisab silver"],
  version: "1.0.0",
  lastReviewed: REFERENCE_RATES.reviewedAt,
  featured: true,
  sources: [ZAKAT.source, { title: "Reference gold & silver prices (Searchable data)", publisher: "Searchable" }],
  fields: [
    { key: "cash", label: "Cash, bank balances & savings", type: "number", unit: "PKR", default: 500_000, min: 0, step: 1000 },
    { key: "goldGrams", label: "Gold owned", type: "number", unit: "grams", default: 0, min: 0, step: 1, help: "1 tola = 11.664 g" },
    { key: "silverGrams", label: "Silver owned", type: "number", unit: "grams", default: 0, min: 0, step: 1 },
    { key: "investments", label: "Investments, shares, business stock", type: "number", unit: "PKR", default: 0, min: 0, step: 1000 },
    { key: "receivables", label: "Money owed to you (expected back)", type: "number", unit: "PKR", default: 0, min: 0, step: 1000 },
    { key: "debts", label: "Debts due within the year", type: "number", unit: "PKR", default: 0, min: 0, step: 1000, help: "Deducted from your zakatable wealth." },
    { key: "nisabBasis", label: "Nisab based on", type: "select", options: [{ value: "silver", label: "Silver (612.36 g) — standard in Pakistan" }, { value: "gold", label: "Gold (87.48 g)" }], default: "silver" },
    { key: "goldPrice", label: "Gold price per gram (24k)", type: "number", unit: "PKR", default: REFERENCE_RATES.goldPerGram24k, min: 0, step: 100 },
    { key: "silverPrice", label: "Silver price per gram", type: "number", unit: "PKR", default: REFERENCE_RATES.silverPerGram, min: 0, step: 1 },
  ],
  compute(input) {
    const goldPrice = num(input, "goldPrice", REFERENCE_RATES.goldPerGram24k);
    const silverPrice = num(input, "silverPrice", REFERENCE_RATES.silverPerGram);
    const goldValue = num(input, "goldGrams") * goldPrice;
    const silverValue = num(input, "silverGrams") * silverPrice;
    const assets = num(input, "cash") + goldValue + silverValue + num(input, "investments") + num(input, "receivables");
    const net = Math.max(0, assets - num(input, "debts"));
    const basis = str(input, "nisabBasis", "silver");
    const nisab = basis === "gold" ? ZAKAT.nisabGoldGrams * goldPrice : ZAKAT.nisabSilverGrams * silverPrice;
    const owes = net >= nisab;
    const zakat = owes ? net * ZAKAT.rate : 0;

    return {
      headline: { label: owes ? "Zakat payable" : "Zakat payable", value: pkr(zakat), primary: true },
      summary: owes
        ? `Your net zakatable wealth of ${pkr(net)} is above the ${basis} nisab of ${pkr(nisab)}, so zakat of 2.5% is due.`
        : `Your net zakatable wealth of ${pkr(net)} is below the ${basis} nisab of ${pkr(nisab)}. Zakat is not obligatory this year.`,
      sections: [
        {
          title: "Zakatable wealth",
          lines: [
            { label: "Cash & savings", value: pkr(num(input, "cash")) },
            { label: "Gold", value: pkr(goldValue), muted: goldValue === 0 },
            { label: "Silver", value: pkr(silverValue), muted: silverValue === 0 },
            { label: "Investments & stock", value: pkr(num(input, "investments")), muted: num(input, "investments") === 0 },
            { label: "Receivables", value: pkr(num(input, "receivables")), muted: num(input, "receivables") === 0 },
            { label: "Less: debts", value: `− ${pkr(num(input, "debts"))}`, muted: num(input, "debts") === 0 },
            { label: "Net zakatable wealth", value: pkr(net), primary: true },
          ],
        },
        {
          title: "Nisab",
          lines: [
            { label: `${basis === "gold" ? "Gold" : "Silver"} nisab today`, value: pkr(nisab) },
            { label: "Status", value: owes ? "Above nisab — zakat due" : "Below nisab" },
          ],
        },
      ],
      warnings: ["Zakat is due once a lunar year has passed on wealth above nisab. Personal-use items (home, car, clothing) are not zakatable. Consult a scholar for complex cases."],
    };
  },
  methodology: `Zakat is **2.5% of net zakatable wealth** held for one lunar year, payable when that wealth is at or above the **nisab**.

Nisab is defined in gold (87.48 g ≈ 7.5 tola) or silver (612.36 g ≈ 52.5 tola). Most Pakistani scholars and the State Bank's annual deduction use the **silver** nisab because it is lower and therefore benefits more recipients.

Zakatable assets include cash, bank balances, gold and silver (including jewellery, per the majority Hanafi view), trade goods, shares held for trading, and money owed to you that you expect to receive. Debts due within the year are deducted.`,
  faqs: [
    { question: "Is zakat due on jewellery I wear?", answer: "According to the Hanafi school followed by most Pakistanis, yes — gold and silver jewellery is zakatable at its metal value." },
    { question: "What is the nisab in rupees this year?", answer: "It changes with silver and gold prices. This calculator computes it live from the prices entered; the State Bank also announces a silver-based figure each Ramadan for bank deductions." },
    { question: "Do I pay zakat on my house or car?", answer: "No — assets for personal use are exempt. Property held for sale or rent income (the income, not the property) may be zakatable." },
    { question: "Does the bank deduct zakat automatically?", answer: "Banks deduct zakat on savings and PLS accounts above nisab on the 1st of Ramadan unless you have filed a declaration (CZ-50) for exemption." },
  ],
  related: { tools: ["income-tax-calculator", "salary-breakdown-calculator"], entities: ["gold"] },
};
