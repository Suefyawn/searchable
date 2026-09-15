import { ELECTRICITY } from "../data/rates";
import { num, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const solarPaybackCalculator: ToolDefinition = {
  slug: "solar-payback-calculator",
  category: "solar",
  name: "Solar System Size & Price Calculator Pakistan",
  seoTitle: "Solar System Calculator Pakistan — 5kW / 10kW Price, Size & Payback with Net Metering",
  shortName: "Solar Payback",
  description: "How many kW of solar you need, what a 5kW or 10kW system costs in Pakistan, your monthly saving with net metering and the payback period.",
  keywords: ["solar system price in pakistan", "5kw solar system price in pakistan", "10kw solar system price in pakistan", "solar panel price in pakistan", "solar calculator pakistan", "solar system size calculator", "net metering savings", "solar payback period", "solar for home pakistan"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  featured: true,
  sources: [ELECTRICITY.source, { title: "Typical installed cost per kW from Searchable directory quotes (2026)", publisher: "Searchable" }],
  fields: [
    { key: "units", label: "Monthly consumption", type: "number", unit: "kWh", default: 600, min: 50, step: 10, help: "Average from your last 12 bills." },
    { key: "costPerKw", label: "Installed cost per kW", type: "number", unit: "PKR", default: 130_000, min: 50_000, step: 5000, help: "Panels + inverter + structure + wiring. Quotes vary by city and brand." },
    { key: "sunHours", label: "Peak sun hours per day", type: "number", default: 4.5, min: 3, max: 6.5, step: 0.1, help: "Lahore ≈ 4.5, Karachi ≈ 5, Quetta ≈ 5.5" },
    { key: "unitRate", label: "Your blended rate per unit", type: "number", unit: "PKR", default: 45, min: 5, max: 80, step: 0.5, help: "Total bill ÷ units. Use the Electricity Bill tool to find it." },
    { key: "exportRate", label: "Export credit rate (net billing)", type: "number", unit: "PKR/unit", default: 11, min: 0, max: 60, step: 0.5, help: "NEPRA's Prosumer Regulations (Feb 2026) credit exports at the national average energy purchase price, about Rs 10–11. Existing pre-2026 agreements get about Rs 25–26 until expiry." },
    { key: "selfUsePct", label: "Share of solar used directly", type: "number", unit: "%", default: 60, min: 10, max: 100, step: 5, help: "Rest is exported to the grid." },
  ],
  compute(input) {
    const units = num(input, "units");
    const sunHours = num(input, "sunHours", 4.5);
    const derate = 0.8; // inverter, temperature, soiling, wiring losses
    const kwNeeded = units / (sunHours * 30 * derate);
    const kw = Math.ceil(kwNeeded * 2) / 2; // round up to 0.5 kW
    const generation = kw * sunHours * 30 * derate;
    const selfUse = Math.min(units, generation * (num(input, "selfUsePct", 60) / 100));
    const exported = Math.max(0, generation - selfUse);
    const savings = selfUse * num(input, "unitRate", 45) + exported * num(input, "exportRate", 11);
    const cost = kw * num(input, "costPerKw", 130_000);
    const paybackYears = savings > 0 ? cost / (savings * 12) : Infinity;
    const lifetimeYears = 25;
    const lifetimeSavings = savings * 12 * lifetimeYears * 0.9 - cost; // ~0.5%/yr degradation approximated

    return {
      headline: { label: "Recommended system", value: `${kw} kW`, primary: true },
      summary: `A ${kw} kW system generates about ${Math.round(generation)} units a month, saving roughly ${pkr(savings)} per month. At ${pkr(cost)} installed, it pays for itself in about ${paybackYears.toFixed(1)} years.`,
      sections: [
        {
          title: "System",
          lines: [
            { label: "Monthly generation", value: `${Math.round(generation)} kWh` },
            { label: "Used directly", value: `${Math.round(selfUse)} kWh`, muted: true },
            { label: "Exported to grid", value: `${Math.round(exported)} kWh`, muted: true },
            { label: "Installed cost", value: pkr(cost), primary: true },
          ],
        },
        {
          title: "Returns",
          lines: [
            { label: "Monthly saving", value: pkr(savings) },
            { label: "Annual saving", value: pkr(savings * 12) },
            { label: "Payback period", value: `${paybackYears.toFixed(1)} years`, primary: true },
            { label: `Net benefit over ${lifetimeYears} years`, value: pkr(lifetimeSavings), muted: true },
          ],
        },
      ],
      warnings: ["Since February 2026 exports are credited at the net-billing rate (about Rs 10–11), so savings depend mostly on how much you use during daylight. Batteries are not included."],
    };
  },
  methodology: `**System size** = monthly units ÷ (peak sun hours × 30 × 0.8). The 0.8 derate accounts for inverter efficiency, heat, dust and wiring losses typical in Pakistan.

**Savings** = units you consume directly × your full per-unit cost + units exported × the DISCO's export credit rate. Direct use is worth more than export, so daytime consumption (ACs, pumps, washing) improves the return.

**Payback** = installed cost ÷ annual savings. Panels are warranted for 25 years; inverters typically need replacement once in that period, which the lifetime figure approximates with a 10% haircut.`,
  faqs: [
    { question: "How much does a 5 kW solar system cost in Pakistan?", answer: "In 2026, roughly Rs 550,000–800,000 installed depending on panel tier, inverter brand and structure. Get three quotes from listed installers." },
    { question: "What is net metering?", answer: "A bi-directional meter that records what you import and export. Under NEPRA's 2026 Prosumer Regulations exports are credited at the national average energy purchase price (net billing) rather than one-for-one. Applications go through your DISCO, then NEPRA concurrence." },
    { question: "Do I need batteries?", answer: "Not for net metering. Batteries add cost and are only worthwhile if load-shedding or backup is the goal." },
    { question: "Which direction should panels face?", answer: "South-facing at roughly your latitude (25–33°) in Pakistan gives the best annual yield." },
  ],
  related: { tools: ["electricity-bill-calculator"], guides: ["how-to-apply-for-net-metering-in-pakistan"], entities: ["nepra"], businessCategories: ["solar-companies"] },
  hubUrl: "/data/solar-panel-price",
};
