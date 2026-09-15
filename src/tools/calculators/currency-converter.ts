import { REFERENCE_RATES } from "../data/rates";
import { num, str, type ToolDefinition } from "../types";
import { number, pkr } from "@/lib/format";

/** Interbank reference rates; overwritten by liveDefaults() from the data hub on every render. */
const FALLBACK: Record<string, number> = { usd: REFERENCE_RATES.usdPkr, eur: 330, gbp: 381, aed: 76.5, sar: 75 };
const NAMES: Record<string, { name: string; symbol: string }> = { usd: { name: "US dollar", symbol: "$" }, eur: { name: "Euro", symbol: "€" }, gbp: { name: "British pound", symbol: "£" }, aed: { name: "UAE dirham", symbol: "AED" }, sar: { name: "Saudi riyal", symbol: "SAR" } };

/** Typical spreads around interbank: banks buy remittances a touch below; open market sells cash above. */
const BANK_BUY = -0.0025;
const OPEN_MARKET_SELL = 0.008;

export const currencyConverter: ToolDefinition = {
  slug: "currency-converter",
  category: "finance",
  name: "USD to PKR Converter — Dollar, Dirham, Riyal, Pound, Euro",
  seoTitle: "USD to PKR Converter Today — Dollar, Dirham (AED), Riyal (SAR), Pound & Euro to Pakistani Rupee at Interbank, Bank and Open Market Rates",
  shortName: "Currency converter",
  description: "Convert dollars, dirhams, riyals, pounds and euros to Pakistani rupees at today's interbank rate, and see what a bank remittance or the open market would actually give you.",
  keywords: ["usd to pkr", "dollar to pkr", "dollar rate today", "aed to pkr", "dirham to pkr", "sar to pkr", "riyal to pkr", "gbp to pkr", "pound to pkr", "euro to pkr", "currency converter pakistan", "interbank rate today", "open market dollar rate", "remittance rate"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  featured: true,
  sources: [{ title: "State Bank of Pakistan — daily interbank closing rates", url: "https://www.sbp.org.pk/ecodata/rates/m2m/M2M-Current.asp", publisher: "State Bank of Pakistan" }, { title: "Exchange Companies Association of Pakistan — open market rates", publisher: "ECAP" }],
  fields: [
    { key: "amount", label: "Amount", type: "number", default: 1000, min: 0, step: 10 },
    {
      key: "currency",
      label: "Currency",
      type: "select",
      options: [
        { value: "usd", label: "US dollar (USD)" },
        { value: "aed", label: "UAE dirham (AED)" },
        { value: "sar", label: "Saudi riyal (SAR)" },
        { value: "gbp", label: "British pound (GBP)" },
        { value: "eur", label: "Euro (EUR)" },
      ],
      default: "usd",
    },
    {
      key: "direction",
      label: "Convert",
      type: "select",
      options: [
        { value: "toPkr", label: "Foreign currency → PKR" },
        { value: "fromPkr", label: "PKR → foreign currency" },
      ],
      default: "toPkr",
    },
    { key: "usd", label: "USD/PKR interbank", type: "number", unit: "PKR", default: FALLBACK.usd, min: 1, step: 0.05 },
    { key: "aed", label: "AED/PKR interbank", type: "number", unit: "PKR", default: FALLBACK.aed, min: 1, step: 0.05 },
    { key: "sar", label: "SAR/PKR interbank", type: "number", unit: "PKR", default: FALLBACK.sar, min: 1, step: 0.05 },
    { key: "gbp", label: "GBP/PKR interbank", type: "number", unit: "PKR", default: FALLBACK.gbp, min: 1, step: 0.05 },
    { key: "eur", label: "EUR/PKR interbank", type: "number", unit: "PKR", default: FALLBACK.eur, min: 1, step: 0.05 },
  ],
  compute(input) {
    const amount = Math.max(0, num(input, "amount"));
    const cur = str(input, "currency", "usd");
    const rate = num(input, cur, FALLBACK[cur] ?? FALLBACK.usd);
    const toPkr = str(input, "direction", "toPkr") !== "fromPkr";
    const meta = NAMES[cur] ?? NAMES.usd;
    if (toPkr) {
      const inter = amount * rate;
      const bank = amount * rate * (1 + BANK_BUY);
      const open = amount * rate * (1 + OPEN_MARKET_SELL);
      return {
        headline: { label: `${meta.symbol} ${number(amount, 2)} at interbank`, value: pkr(inter), primary: true },
        summary: `1 ${cur.toUpperCase()} = Rs ${number(rate, 2)} interbank. A bank remittance typically credits about ${pkr(bank)}; buying ${meta.symbol} ${number(amount, 0)} in cash from an exchange company costs about ${pkr(open)}.`,
        sections: [
          {
            title: "What you get",
            lines: [
              { label: `Interbank (${number(rate, 2)})`, value: pkr(inter) },
              { label: `Bank remittance credit (≈ interbank − 0.25%)`, value: pkr(bank), note: "Banks convert inbound remittances close to interbank; RDA and Sohni Dharti add incentives on top." },
              { label: `Open market cash (≈ interbank + 0.8%)`, value: pkr(open), note: "What an exchange company charges to sell you cash; their buying rate is lower." },
            ],
          },
          { title: "Quick table", lines: [1, 100, 500, 1000, 5000].map((n) => ({ label: `${meta.symbol} ${number(n, 0)}`, value: pkr(n * rate), muted: true })) },
        ],
        warnings: ["Interbank is the SBP closing rate from the data hub; bank and open-market figures are typical spreads, not live quotes. Check with your bank or exchange company before a large transfer."],
      };
    }
    const fx = amount / rate;
    return {
      headline: { label: `${pkr(amount)} in ${meta.name}s`, value: `${meta.symbol} ${number(fx, 2)}`, primary: true },
      summary: `At Rs ${number(rate, 2)} per ${cur.toUpperCase()}, ${pkr(amount)} buys ${meta.symbol} ${number(fx, 2)} interbank; an exchange company would give about ${meta.symbol} ${number(amount / (rate * (1 + OPEN_MARKET_SELL)), 2)} in cash.`,
      sections: [
        {
          title: "What you get",
          lines: [
            { label: "Interbank", value: `${meta.symbol} ${number(fx, 2)}` },
            { label: "Open market cash (≈ +0.8%)", value: `${meta.symbol} ${number(amount / (rate * (1 + OPEN_MARKET_SELL)), 2)}` },
          ],
        },
      ],
      warnings: ["Buying foreign currency in cash above US$500 equivalent requires a CNIC and, for larger amounts, the purpose (travel, education, medical) under SBP rules."],
    };
  },
  methodology: `Rates come from the **data hub** (SBP interbank closing) and are injected on every page load; you can override them. Three numbers matter in Pakistan:

- **Interbank** — the rate banks trade at and the SBP publishes daily. The benchmark in news and this converter's default.
- **Bank remittance / TT** — what your bank credits for an inbound transfer; usually a fraction below interbank, sometimes above with government remittance incentives (Roshan Digital Account, Sohni Dharti points).
- **Open market** — exchange-company counter rates for cash. Selling rate to you is typically 0.5–1.5% above interbank; the gap widens when the rupee is under pressure.

The tool shows typical spreads (−0.25% for bank credits, +0.8% for open-market cash) so you can see the range, not just one number.`,
  faqs: [
    { question: "What is the dollar rate in Pakistan today?", answer: "The default in this converter is the latest SBP interbank closing rate from the Searchable data hub, with the date shown under the field. Open-market cash rates run roughly 0.5–1.5% higher." },
    { question: "Which rate will I get for a remittance from Dubai or Saudi Arabia?", answer: "Your bank converts at close to the interbank rate on the day it credits; some exchange houses lock the rate at sending time. Use the AED or SAR option here for the interbank figure and expect a small margin either way." },
    { question: "Why is the open market rate higher than interbank?", answer: "Cash carries handling cost, scarcity and demand from travellers and importers who cannot access interbank. When the gap exceeds ~1.5% SBP usually intervenes." },
    { question: "Can I buy dollars from a bank?", answer: "Yes, against a CNIC and a purpose (travel, education, medical, subscriptions) within SBP limits; exchange companies sell cash more readily but at the open-market rate." },
  ],
  related: { tools: ["pta-mobile-tax-calculator", "zakat-calculator"], guides: ["how-to-open-a-roshan-digital-account"], entities: ["sbp", "usd-pkr"], businessCategories: ["banks"] },
};
