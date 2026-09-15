import { num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

const AC_TYPES: Record<string, { label: string; kw: number; dutyFactor: number }> = {
  "1-inverter": { label: "1 ton inverter", kw: 1.0, dutyFactor: 0.6 },
  "1.5-inverter": { label: "1.5 ton inverter", kw: 1.4, dutyFactor: 0.6 },
  "2-inverter": { label: "2 ton inverter", kw: 1.9, dutyFactor: 0.6 },
  "1-fixed": { label: "1 ton non-inverter", kw: 1.2, dutyFactor: 0.75 },
  "1.5-fixed": { label: "1.5 ton non-inverter", kw: 1.8, dutyFactor: 0.75 },
  "2-fixed": { label: "2 ton non-inverter", kw: 2.4, dutyFactor: 0.75 },
};

export const acRunningCostCalculator: ToolDefinition = {
  slug: "ac-running-cost-calculator",
  category: "utilities",
  name: "AC Running Cost Calculator",
  shortName: "AC Cost",
  description: "How many units an air conditioner adds to your bill and what it costs per month, for inverter and non-inverter 1, 1.5 and 2 ton units.",
  keywords: ["ac electricity cost", "ac units per hour", "1.5 ton ac bill", "inverter ac bill", "ac running cost pakistan", "how many units does ac use", "ac bill calculator"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  sources: [{ title: "Typical rated power draw from manufacturer datasheets (Gree, Haier, Dawlance, Orient)", publisher: "Searchable" }],
  fields: [
    { key: "type", label: "AC type", type: "select", options: Object.entries(AC_TYPES).map(([value, t]) => ({ value, label: t.label })), default: "1.5-inverter" },
    { key: "hours", label: "Hours per day", type: "number", unit: "h", default: 8, min: 0, max: 24, step: 0.5 },
    { key: "days", label: "Days per month", type: "number", default: 30, min: 1, max: 31, step: 1 },
    { key: "temp", label: "Set temperature", type: "select", options: [{ value: "24", label: "24°C (recommended)" }, { value: "22", label: "22°C" }, { value: "20", label: "20°C" }, { value: "18", label: "18°C or lower" }], default: "24" },
    { key: "rate", label: "Your all-in rate per unit", type: "number", unit: "PKR", default: 45, min: 5, max: 80, step: 0.5, help: "Total bill ÷ units. Use the Electricity Bill tool if unsure." },
  ],
  compute(input) {
    const t = AC_TYPES[str(input, "type", "1.5-inverter")] ?? AC_TYPES["1.5-inverter"];
    const tempFactor = { "24": 1, "22": 1.12, "20": 1.25, "18": 1.4 }[str(input, "temp", "24")] ?? 1;
    const hours = num(input, "hours", 8);
    const days = num(input, "days", 30);
    const unitsPerHour = t.kw * t.dutyFactor * tempFactor;
    const units = unitsPerHour * hours * days;
    const rate = num(input, "rate", 45);
    const cost = units * rate;
    const at24 = t.kw * t.dutyFactor * hours * days * rate;
    return {
      headline: { label: "Monthly cost of this AC", value: pkr(cost), primary: true },
      summary: `A ${t.label} at ${str(input, "temp", "24")}°C uses about ${unitsPerHour.toFixed(2)} units per hour — ${Math.round(units)} units a month for ${hours} h/day.${tempFactor > 1 ? ` Setting 24°C instead would save about ${pkr(cost - at24)}.` : ""}`,
      sections: [
        {
          title: "Usage",
          lines: [
            { label: "Units per hour", value: `${unitsPerHour.toFixed(2)} kWh` },
            { label: "Units per day", value: `${(unitsPerHour * hours).toFixed(1)} kWh` },
            { label: "Units per month", value: `${Math.round(units)} kWh`, primary: true },
          ],
        },
        {
          title: "Cost",
          lines: [
            { label: `${Math.round(units)} units × ${pkr(rate)}`, value: pkr(cost) },
            { label: "Per day", value: pkr(cost / Math.max(1, days)), muted: true },
            { label: "Summer season (5 months)", value: pkr(cost * 5), muted: true },
          ],
        },
      ],
      warnings: ["Extra units can push you into a higher tariff slab, so the true marginal cost may be higher than the average rate you entered."],
    };
  },
  methodology: `Units per hour = rated power (kW) × duty factor × temperature factor.

- **Rated power** is the compressor's draw at full load (≈1.4 kW for a 1.5 ton inverter; ≈1.8 kW non-inverter).
- **Duty factor** reflects that the compressor does not run flat out once the room is cool — around 60% for inverters (they modulate) and 75% for non-inverters (they cycle on/off).
- **Temperature factor**: each degree below 24°C raises consumption by roughly 6%.

Multiply by hours and days for monthly units, then by your all-in per-unit rate.`,
  faqs: [
    { question: "How many units does a 1.5 ton AC use per hour?", answer: "About 0.8–1.0 units for an inverter at 24°C and 1.3–1.5 units for a non-inverter, rising as you set the temperature lower." },
    { question: "Is an inverter AC worth it?", answer: "At 8 hours a day, an inverter typically saves 35–45% versus a non-inverter — usually paying back the price difference within two summers." },
    { question: "Does 26°C really save money?", answer: "Yes — each degree higher saves roughly 6%. 26°C with a fan is the cheapest comfortable setting." },
  ],
  related: { tools: ["electricity-bill-calculator", "solar-payback-calculator"], entities: ["nepra", "lesco", "k-electric"], businessCategories: ["electricians", "solar-companies"] },
};
