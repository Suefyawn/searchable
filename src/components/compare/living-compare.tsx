"use client";

import { Comparator, type CompareConfig } from "@/components/compare/comparator";
import { specNum, specText, type LivingItemT, type LivingSlug } from "@/lib/compare-shared";

const rs = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;
const yes = (v: unknown) => v === true || v === "yes" || v === "Yes";

/** Column, filter and sort definitions for each living comparison; the items come from the settings row. */
function configFor(slug: LivingSlug, items: LivingItemT[]): CompareConfig<LivingItemT> {
  const brands = [...new Set(items.map((i) => i.brand))].sort();
  const s = (i: LivingItemT, k: string) => i.specs[k];
  if (slug === "air-conditioners") {
    const tons = [...new Set(items.map((i) => specText(s(i, "tonnage"))))].sort();
    return {
      noun: "air conditioner",
      max: 3,
      id: (i) => i.id,
      title: (i) => `${i.brand} ${i.model}`,
      subtitle: (i) => [specText(s(i, "tonnage")) + " ton", yes(s(i, "inverter")) ? "inverter" : "non-inverter", i.priceNote].filter(Boolean).join(" · "),
      price: (i) => rs(i.price),
      priceNum: (i) => i.price,
      searchText: (i) => `${i.brand} ${i.model} ${Object.values(i.specs).join(" ")} ${i.note ?? ""}`,
      specs: [
        { key: "tonnage", label: "Tonnage", get: (i) => `${specText(s(i, "tonnage"))} ton`, num: (i) => specNum(s(i, "tonnage")), column: true, card: true },
        { key: "inverter", label: "Inverter", get: (i) => specText(s(i, "inverter")), column: true, card: true },
        { key: "heatCool", label: "Heat and cool", get: (i) => specText(s(i, "heatCool")), column: true, card: true },
        { key: "t3", label: "T3 (works to 55°C)", get: (i) => specText(s(i, "t3")), column: true },
        { key: "eer", label: "EER", get: (i) => specText(s(i, "eer")), num: (i) => specNum(s(i, "eer")), best: "max", column: true, align: "right", card: true },
        { key: "wifi", label: "Wi-Fi", get: (i) => specText(s(i, "wifi")) },
        { key: "warranty", label: "Compressor warranty", get: (i) => specText(s(i, "warranty")), num: (i) => specNum(s(i, "warranty")), best: "max" },
        { key: "note", label: "Note", get: (i) => i.note ?? "-" },
      ],
      filters: [
        { key: "ton", label: "Tonnage", options: tons.map((t) => ({ value: t, label: `${t} ton`, test: (i) => specText(s(i, "tonnage")) === t })) },
        { key: "brand", label: "Brand", options: brands.map((b) => ({ value: b.toLowerCase(), label: b, test: (i) => i.brand === b })) },
        { key: "kind", label: "Type", options: [{ value: "inverter", label: "Inverter", test: (i) => yes(s(i, "inverter")) }, { value: "fixed", label: "Non-inverter", test: (i) => !yes(s(i, "inverter")) }] },
      ],
      sorts: [
        { key: "price", label: "Price, low to high", compare: (a, b) => a.price - b.price },
        { key: "priceDesc", label: "Price, high to low", compare: (a, b) => b.price - a.price },
        { key: "eer", label: "Efficiency (EER)", compare: (a, b) => (specNum(s(b, "eer")) ?? 0) - (specNum(s(a, "eer")) ?? 0) },
        { key: "brand", label: "Brand", compare: (a, b) => a.brand.localeCompare(b.brand) || a.price - b.price },
      ],
      actions: (i) => {
        const ton = specNum(s(i, "tonnage")) ?? 1.5;
        const type = `${ton === 1 ? "1" : ton >= 2 ? "2" : "1.5"}-${yes(s(i, "inverter")) ? "inverter" : "fixed"}`;
        return [{ href: `/tools/utilities/ac-running-cost-calculator?type=${type}`, label: "Monthly running cost" }, { href: `/tools/utilities/electricity-bill-calculator`, label: "Bill with this AC" }];
      },
    };
  }
  if (slug === "mobile-packages") {
    const validities = [...new Set(items.map((i) => specText(s(i, "validity"))))];
    const gb = (i: LivingItemT) => specNum(s(i, "data"));
    const perGb = (i: LivingItemT) => {
      const g = gb(i);
      return g ? i.price / g : null;
    };
    return {
      noun: "package",
      max: 3,
      id: (i) => i.id,
      title: (i) => `${i.brand} ${i.model}`,
      subtitle: (i) => [specText(s(i, "validity")), specText(s(i, "network")), i.priceNote].filter(Boolean).join(" · "),
      price: (i) => rs(i.price),
      priceNum: (i) => i.price,
      searchText: (i) => `${i.brand} ${i.model} ${Object.values(i.specs).join(" ")} ${i.note ?? ""}`,
      specs: [
        { key: "data", label: "Data", get: (i) => (gb(i) !== null ? `${specText(s(i, "data"))} GB` : specText(s(i, "data"))), num: gb, best: "max", column: true, card: true, align: "right" },
        { key: "perGb", label: "Rs per GB", get: (i) => (perGb(i) !== null ? `Rs ${perGb(i)!.toFixed(0)}` : "-"), num: perGb, best: "min", column: true, card: true, align: "right" },
        { key: "onnet", label: "On-net minutes", get: (i) => specText(s(i, "onnetMinutes")), num: (i) => specNum(s(i, "onnetMinutes")), best: "max", column: true, card: true },
        { key: "offnet", label: "Off-net minutes", get: (i) => specText(s(i, "offnetMinutes")), num: (i) => specNum(s(i, "offnetMinutes")), best: "max", column: true },
        { key: "sms", label: "SMS", get: (i) => specText(s(i, "sms")), num: (i) => specNum(s(i, "sms")), best: "max" },
        { key: "validity", label: "Validity", get: (i) => specText(s(i, "validity")), column: true },
        { key: "code", label: "Subscribe", get: (i) => specText(s(i, "code")), card: true },
        { key: "note", label: "Note", get: (i) => i.note ?? "-" },
      ],
      filters: [
        { key: "network", label: "Network", options: brands.map((b) => ({ value: b.toLowerCase(), label: b, test: (i) => i.brand === b })) },
        { key: "validity", label: "Validity", options: validities.map((v) => ({ value: v.toLowerCase().replace(/\s+/g, "-"), label: v, test: (i) => specText(s(i, "validity")) === v })) },
        {
          key: "budget",
          label: "Price",
          options: [
            { value: "500", label: "Under Rs 500", test: (i) => i.price < 500 },
            { value: "1500", label: "Rs 500 to 1,500", test: (i) => i.price >= 500 && i.price < 1500 },
            { value: "1500plus", label: "Rs 1,500 and up", test: (i) => i.price >= 1500 },
          ],
        },
      ],
      sorts: [
        { key: "perGb", label: "Rs per GB, low to high", compare: (a, b) => (perGb(a) ?? 9e9) - (perGb(b) ?? 9e9) },
        { key: "price", label: "Price, low to high", compare: (a, b) => a.price - b.price },
        { key: "data", label: "Most data", compare: (a, b) => (gb(b) ?? 0) - (gb(a) ?? 0) },
        { key: "network", label: "Network", compare: (a, b) => a.brand.localeCompare(b.brand) || a.price - b.price },
      ],
      actions: (i) => [{ href: `/tools/telecom/mobile-load-tax-calculator?amount=${Math.round(i.price)}`, label: "Tax on the load" }, ...(i.url ? [{ href: i.url, label: `${i.brand} page` }] : [])],
    };
  }
  if (slug === "national-savings") {
    const payouts = [...new Set(items.map((i) => specText(s(i, "payout"))))];
    return {
      noun: "scheme",
      max: 3,
      id: (i) => i.id,
      title: (i) => i.model,
      subtitle: (i) => [specText(s(i, "term")), specText(s(i, "payout")) + " profit", i.priceNote].filter(Boolean).join(" · "),
      price: (i) => `${i.price.toFixed(2)}% a year`,
      priceNum: (i) => i.price,
      searchText: (i) => `${i.model} ${Object.values(i.specs).join(" ")} ${i.note ?? ""}`,
      specs: [
        { key: "payout", label: "Profit paid", get: (i) => specText(s(i, "payout")), column: true, card: true },
        { key: "term", label: "Term", get: (i) => specText(s(i, "term")), column: true, card: true },
        { key: "min", label: "Minimum", get: (i) => (specNum(s(i, "min")) !== null ? rs(specNum(s(i, "min"))!) : "-"), num: (i) => specNum(s(i, "min")), best: "min", column: true, align: "right", card: true },
        { key: "max", label: "Maximum", get: (i) => (specNum(s(i, "max")) !== null ? rs(specNum(s(i, "max"))!) : "No limit"), column: true, align: "right" },
        { key: "who", label: "Who can buy", get: (i) => specText(s(i, "who")), card: true },
        { key: "withholding", label: "Withholding tax", get: (i) => specText(s(i, "withholding")), column: true },
        { key: "note", label: "Note", get: (i) => i.note ?? "-" },
      ],
      filters: [
        { key: "payout", label: "Profit paid", options: payouts.map((v) => ({ value: v.toLowerCase().replace(/\s+/g, "-"), label: v, test: (i) => specText(s(i, "payout")) === v })) },
        { key: "who", label: "For", options: [{ value: "anyone", label: "Anyone", test: (i) => /anyone/i.test(specText(s(i, "who"))) }, { value: "seniors", label: "Seniors, widows, pensioners", test: (i) => !/anyone/i.test(specText(s(i, "who"))) }] },
        { key: "islamic", label: "Type", options: [{ value: "islamic", label: "Islamic", test: (i) => yes(s(i, "islamic")) }, { value: "conventional", label: "Conventional", test: (i) => !yes(s(i, "islamic")) }] },
      ],
      sorts: [
        { key: "rate", label: "Profit rate, high to low", compare: (a, b) => b.price - a.price },
        { key: "min", label: "Lowest minimum first", compare: (a, b) => (specNum(s(a, "min")) ?? 0) - (specNum(s(b, "min")) ?? 0) },
        { key: "name", label: "Name", compare: (a, b) => a.model.localeCompare(b.model) },
      ],
      actions: (i) => [{ href: `/tools/finance/national-savings-calculator?scheme=${i.id}`, label: "Monthly profit on your amount" }, ...(i.url ? [{ href: i.url, label: "National Savings page" }] : [])],
    };
  }
  const banks = [...new Set(items.map((i) => specText(s(i, "bank"))))].sort();
  return {
    noun: "card",
    max: 3,
    id: (i) => i.id,
    title: (i) => `${i.brand} ${i.model}`,
    subtitle: (i) => [specText(s(i, "network")), yes(s(i, "islamic")) ? "Islamic" : null, i.priceNote].filter(Boolean).join(" · "),
    price: (i) => (i.price === 0 ? "No annual fee" : `${rs(i.price)} a year`),
    priceNum: (i) => i.price,
    searchText: (i) => `${i.brand} ${i.model} ${Object.values(i.specs).join(" ")} ${i.note ?? ""}`,
    specs: [
      { key: "apr", label: "Mark-up (APR)", get: (i) => (specNum(s(i, "apr")) !== null ? `${specText(s(i, "apr"))}% a year` : "-"), num: (i) => specNum(s(i, "apr")), best: "min", column: true, align: "right", card: true },
      { key: "minIncome", label: "Minimum income", get: (i) => (specNum(s(i, "minIncome")) !== null ? `${rs(specNum(s(i, "minIncome"))!)} a month` : "-"), num: (i) => specNum(s(i, "minIncome")), best: "min", column: true, align: "right", card: true },
      { key: "cashback", label: "Cashback or rewards", get: (i) => specText(s(i, "cashback")), column: true, card: true },
      { key: "lounge", label: "Airport lounge", get: (i) => specText(s(i, "lounge")), column: true, card: true },
      { key: "fuel", label: "Fuel discount", get: (i) => specText(s(i, "fuel")) },
      { key: "freeFirstYear", label: "First year free", get: (i) => specText(s(i, "freeFirstYear")) },
      { key: "network", label: "Network", get: (i) => specText(s(i, "network")) },
      { key: "note", label: "Note", get: (i) => i.note ?? "-" },
    ],
    filters: [
      { key: "bank", label: "Bank", options: banks.map((b) => ({ value: b.toLowerCase().replace(/\s+/g, "-"), label: b, test: (i) => specText(s(i, "bank")) === b })) },
      { key: "fee", label: "Annual fee", options: [{ value: "free", label: "No fee", test: (i) => i.price === 0 }, { value: "under5k", label: "Under Rs 5,000", test: (i) => i.price > 0 && i.price < 5000 }, { value: "5kplus", label: "Rs 5,000 and up", test: (i) => i.price >= 5000 }] },
      { key: "type", label: "Type", options: [{ value: "islamic", label: "Islamic", test: (i) => yes(s(i, "islamic")) }, { value: "conventional", label: "Conventional", test: (i) => !yes(s(i, "islamic")) }] },
    ],
    sorts: [
      { key: "fee", label: "Annual fee, low to high", compare: (a, b) => a.price - b.price },
      { key: "apr", label: "Mark-up, low to high", compare: (a, b) => (specNum(s(a, "apr")) ?? 99) - (specNum(s(b, "apr")) ?? 99) },
      { key: "income", label: "Minimum income", compare: (a, b) => (specNum(s(a, "minIncome")) ?? 9e9) - (specNum(s(b, "minIncome")) ?? 9e9) },
      { key: "bank", label: "Bank", compare: (a, b) => specText(s(a, "bank")).localeCompare(specText(s(b, "bank"))) || a.price - b.price },
    ],
    actions: (i) => [{ href: `/tools/finance/personal-loan-calculator`, label: "Cost of carrying a balance" }, ...(i.url ? [{ href: i.url, label: `${specText(s(i, "bank"))} page` }] : [])],
  };
}

export function LivingCompare({ slug, items }: { slug: LivingSlug; items: LivingItemT[] }) {
  return <Comparator items={items} config={configFor(slug, items)} />;
}
