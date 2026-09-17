import { REFERENCE_RATES } from "../data/rates";
import { num, str, type ToolDefinition } from "../types";
import { number, pkr } from "@/lib/format";

/** Grams per unit. A tola is 11.664 g in the Pakistani market; a masha is a twelfth of a tola and a ratti an eighth of a masha. */
const GRAMS: Record<string, { label: string; grams: number }> = {
  tola: { label: "Tola", grams: 11.664 },
  gram: { label: "Gram", grams: 1 },
  masha: { label: "Masha", grams: 11.664 / 12 },
  ratti: { label: "Ratti", grams: 11.664 / 96 },
  ounce: { label: "Troy ounce", grams: 31.1035 },
  kg: { label: "Kilogram", grams: 1000 },
};

export const goldConverter: ToolDefinition = {
  slug: "gold-converter",
  category: "finance",
  name: "Tola to Gram Converter & Gold Value Calculator",
  seoTitle: "Tola to Gram Converter: 1 Tola in Grams, Gold Value at Today's Rate (24K, 22K, 21K, 18K)",
  shortName: "Gold converter",
  description: "Convert tola, gram, masha, ratti and troy ounce, and see what your gold is worth today at 24K, 22K, 21K or 18K purity using the live Karachi Sarafa rate.",
  keywords: ["tola to gram", "gram to tola", "1 tola in grams", "gold calculator", "gold rate calculator", "gold price calculator", "tola to ounce", "masha to gram", "22k gold rate calculator", "gold value calculator pakistan", "how many grams in a tola"],
  version: "1.0.0",
  lastReviewed: REFERENCE_RATES.reviewedAt,
  sources: [{ title: "Gold rate per tola (24K), Karachi Sarafa market, from the Searchable data hub", url: "https://searchable.pk/data/gold-24k-tola", publisher: "All Pakistan Sarafa Gems & Jewellers Association" }],
  fields: [
    { key: "amount", label: "Weight", type: "number", default: 1, min: 0, step: 0.1 },
    { key: "unit", label: "Unit", type: "select", options: Object.entries(GRAMS).map(([value, u]) => ({ value, label: u.label })), default: "tola" },
    { key: "karat", label: "Purity", type: "select", options: [{ value: "24", label: "24K (99.9%)" }, { value: "22", label: "22K (91.6%)" }, { value: "21", label: "21K (87.5%)" }, { value: "18", label: "18K (75%)" }], default: "22" },
    { key: "price", label: "24K gold rate per tola today", type: "number", unit: "PKR", default: REFERENCE_RATES.goldPerTola24k, min: 0, step: 500, help: "Filled from today's rate; edit if your jeweller quotes differently." },
  ],
  compute(input) {
    const amount = Math.max(0, num(input, "amount", 1));
    const unit = GRAMS[str(input, "unit", "tola")] ? str(input, "unit", "tola") : "tola";
    const karat = Math.min(24, Math.max(1, num(input, "karat", Number(str(input, "karat", "22")) || 22)));
    const pricePerTola = Math.max(0, num(input, "price", REFERENCE_RATES.goldPerTola24k));
    const grams = amount * GRAMS[unit].grams;
    const perGram24k = pricePerTola / GRAMS.tola.grams;
    const value = grams * perGram24k * (karat / 24);
    const fmt = (g: number) => number(g, g >= 100 ? 1 : 3);
    return {
      headline: { label: `Value of ${number(amount, 3)} ${GRAMS[unit].label.toLowerCase()} of ${karat}K gold`, value: pkr(value), primary: true },
      summary: `${number(amount, 3)} ${GRAMS[unit].label.toLowerCase()} is ${fmt(grams)} grams. At ${pkr(pricePerTola)} per tola for 24K, ${karat}K gold is ${pkr(perGram24k * (karat / 24))} per gram, so this weight is worth ${pkr(value)}.`,
      sections: [
        {
          title: "Weight in every unit",
          lines: [
            { label: "Tola", value: fmt(grams / GRAMS.tola.grams) },
            { label: "Grams", value: fmt(grams) },
            { label: "Masha", value: fmt(grams / GRAMS.masha.grams), muted: true },
            { label: "Ratti", value: fmt(grams / GRAMS.ratti.grams), muted: true },
            { label: "Troy ounce", value: fmt(grams / GRAMS.ounce.grams), muted: true },
          ],
        },
        {
          title: "Value by purity",
          lines: [24, 22, 21, 18].map((k) => ({ label: `${k}K (${number((k / 24) * 100, 1)}% pure)`, value: pkr(grams * perGram24k * (k / 24)), primary: k === karat })),
        },
        {
          title: "Today's rate",
          lines: [
            { label: "24K per tola", value: pkr(pricePerTola) },
            { label: "24K per gram", value: pkr(perGram24k), muted: true },
            { label: "24K per 10 grams", value: pkr(perGram24k * 10), muted: true },
          ],
        },
      ],
      warnings: ["Jewellers add making charges and may deduct a wastage or polish allowance when buying back; the value shown is the metal only."],
    };
  },
  methodology: `Pakistan's gold trade quotes per **tola**, which the Sarafa markets take as **11.664 grams** (the old British India tola of 180 grains). One tola is 12 **masha**, one masha is 8 **ratti**, and a troy ounce is 31.1035 grams.

The quoted rate is for **24K** (99.9% pure). Jewellery is usually 22K (22/24 = 91.6%) or 21K (87.5%), so its metal value is the 24K rate scaled by the karat fraction: *value = grams x (24K rate per tola / 11.664) x (karat / 24)*.

The default rate comes from the Searchable data hub, which records the Karachi Sarafa association's daily 24K quote.`,
  faqs: [
    { question: "How many grams in a tola?", answer: "11.664 grams in Pakistan and India's jewellery trade. Some countries use a rounded 11.66 g or the older 12.5 g tola; the difference matters on large weights." },
    { question: "How many tola in 100 grams?", answer: "100 grams is 8.574 tola (100 divided by 11.664)." },
    { question: "How do I work out the price of 22K gold per tola?", answer: "Multiply the 24K rate by 22/24 (0.9167). If 24K is Rs 372,000 per tola, 22K is about Rs 341,000." },
    { question: "What is a masha and a ratti?", answer: "Traditional subdivisions still used by jewellers: 12 masha make a tola (0.972 g each) and 8 ratti make a masha (0.1215 g each)." },
  ],
  related: { tools: ["zakat-calculator", "currency-converter"], entities: ["gold"] },
};
