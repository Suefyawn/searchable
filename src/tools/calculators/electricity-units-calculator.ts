import { APPLIANCES } from "../data/appliances";
import { ELECTRICITY, energyCharge } from "../data/rates";
import { num, type Field, type ToolDefinition } from "../types";
import { number, pkr } from "@/lib/format";

const KEYS = ["fan", "led", "fridge", "acInverter", "acFixed", "tv", "pump", "iron", "washer", "geyser", "laptop"] as const;
const DEFAULTS: Record<(typeof KEYS)[number], [number, number]> = { fan: [3, 12], led: [8, 6], fridge: [1, 24], acInverter: [1, 8], acFixed: [0, 8], tv: [1, 5], pump: [1, 1], iron: [1, 0.5], washer: [1, 0.5], geyser: [0, 1], laptop: [2, 6] };

const fields: Field[] = KEYS.flatMap((k): Field[] => [
  { key: `n_${k}`, label: `${APPLIANCES.items[k].label}: how many`, type: "number", default: DEFAULTS[k][0], min: 0, max: 20, step: 1 },
  { key: `h_${k}`, label: `${APPLIANCES.items[k].label}: hours a day`, type: "number", default: DEFAULTS[k][1], min: 0, max: 24, step: 0.5 },
]);

export const electricityUnitsCalculator: ToolDefinition = {
  slug: "electricity-units-calculator",
  category: "utilities",
  name: "Electricity Units Calculator (kWh per Month)",
  seoTitle: "Electricity Unit Calculator: How Many Units Your Fans, AC, Fridge and Lights Use a Month",
  shortName: "Units calculator",
  description: "Count the units (kWh) your home uses in a month from each appliance's wattage and hours, see which ones cost the most, and estimate the bill at the current slab rates.",
  keywords: ["electricity unit calculator", "unit calculator", "kwh calculator", "electricity consumption calculator", "how many units does ac use", "ac units per hour", "fridge units per month", "electricity usage calculator pakistan", "watt to unit calculator", "load calculator for home"],
  version: "1.0.0",
  lastReviewed: APPLIANCES.reviewedAt,
  sources: [APPLIANCES.source, ELECTRICITY.source],
  fields: [...fields, { key: "otherWatts", label: "Anything else: total watts", type: "number", unit: "W", default: 0, min: 0, step: 10 }, { key: "otherHours", label: "Anything else: hours a day", type: "number", default: 0, min: 0, max: 24, step: 0.5 }],
  compute(input) {
    const rows: { label: string; kwh: number }[] = [];
    let daily = 0;
    for (const k of KEYS) {
      const n = Math.max(0, num(input, `n_${k}`));
      const h = Math.min(24, Math.max(0, num(input, `h_${k}`)));
      const a = APPLIANCES.items[k];
      const kwh = (n * a.watts * a.duty * h) / 1000;
      if (kwh > 0) rows.push({ label: `${n} x ${a.label.toLowerCase()}, ${number(h, 1)} h`, kwh });
      daily += kwh;
    }
    const other = (Math.max(0, num(input, "otherWatts")) * Math.min(24, Math.max(0, num(input, "otherHours")))) / 1000;
    if (other > 0) rows.push({ label: "Other appliances", kwh: other });
    daily += other;
    const monthly = Math.round(daily * 30);
    const charge = energyCharge(monthly, ELECTRICITY.unprotected);
    const withTaxes = charge.total * (1 + ELECTRICITY.electricityDutyRate) * (1 + ELECTRICITY.gstRate);
    rows.sort((a, b) => b.kwh - a.kwh);
    return {
      headline: { label: "Units per month", value: `${number(monthly)} kWh`, primary: true },
      summary: monthly ? `Your appliances use about ${number(daily, 1)} units a day, ${number(monthly)} a month. At the residential slab rates that is roughly ${pkr(charge.total)} in energy charges, about ${pkr(withTaxes)} with duty and GST before the fixed charges and fuel adjustment.` : "Enter how many of each appliance you run and for how long.",
      sections: [
        { title: "Where the units go", lines: rows.slice(0, 8).map((r, i) => ({ label: r.label, value: `${number(r.kwh * 30)} units`, primary: i === 0, muted: i > 2 })) },
        {
          title: "Bill estimate",
          lines: [
            { label: "Units a day", value: `${number(daily, 1)} kWh` },
            { label: "Energy charge at slab rates", value: pkr(charge.total) },
            { label: "With electricity duty and GST", value: pkr(withTaxes), primary: true },
          ],
        },
      ],
      warnings: ["Wattages are typical running figures; an old fridge or a non-inverter AC can use half as much again. Run the Electricity Bill calculator with your unit count for the full bill including fixed charges and fuel adjustment."],
    };
  },
  methodology: `A **unit** is one kilowatt-hour: 1,000 watts running for one hour. For each appliance, *units per day = watts x duty factor x hours / 1,000*, where the duty factor is the share of switched-on time a thermostat-controlled appliance (fridge, AC, iron, geyser) actually draws power.

Monthly units are the daily figure times 30. The bill estimate applies NEPRA's residential slab rates for unprotected consumers: telescopic up to 200 units, then the whole consumption at the rate of the slab reached, plus 1.5% electricity duty and 17% GST. Fixed charges, fuel price adjustment and quarterly adjustments are on top; the Electricity Bill calculator adds them.`,
  faqs: [
    { question: "How many units does a 1.5 ton AC use per hour?", answer: "About 0.85 units an hour for an inverter AC once the room is cool (1.4 kW at 60% duty) and about 1.35 for a non-inverter unit. Eight hours a night is 200 to 320 units a month." },
    { question: "How many units does a fridge use per month?", answer: "A medium refrigerator running all day uses about 1.4 units a day, around 45 units a month; older or larger models use 60 to 90." },
    { question: "How many units does a ceiling fan use?", answer: "A 75 W fan uses 0.9 units in 12 hours. Three fans for 12 hours a day come to about 80 units a month." },
    { question: "Why is my bill higher than my units suggest?", answer: "Above 200 units the slab benefit is withdrawn, so all units are billed at the higher rate, and fixed charges, fuel adjustment, duty, GST and TV fee are added. Crossing 200 units can raise the bill by half." },
  ],
  related: { tools: ["electricity-bill-calculator", "ac-running-cost-calculator", "battery-backup-calculator", "solar-panel-calculator"], entities: ["nepra"] },
};
