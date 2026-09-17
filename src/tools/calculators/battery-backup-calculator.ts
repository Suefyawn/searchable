import { num, str, type ToolDefinition } from "../types";
import { number } from "@/lib/format";

export const batteryBackupCalculator: ToolDefinition = {
  slug: "battery-backup-calculator",
  category: "utilities",
  name: "UPS Battery Backup Time Calculator",
  seoTitle: "Battery Backup Calculator: How Long a UPS or Inverter Runs Your Fans, Lights and Fridge",
  shortName: "Battery backup",
  description: "How many hours your UPS, inverter or solar battery bank will run a given load, from the battery's amp-hours, voltage, count and type, with the load in watts.",
  keywords: ["battery backup calculator", "ups backup time calculator", "inverter battery backup time", "how long will a 150ah battery last", "battery backup time formula", "ups battery calculator", "solar battery backup hours", "lithium battery backup calculator", "load shedding backup"],
  version: "1.0.0",
  lastReviewed: "2026-09-18",
  sources: [{ title: "Battery manufacturers' depth-of-discharge guidance (AGS, Exide, Phoenix, Osaka; lithium iron phosphate packs)", publisher: "Searchable" }],
  fields: [
    { key: "ah", label: "Battery capacity", type: "number", unit: "Ah", default: 150, min: 1, step: 5, help: "Printed on the battery, e.g. 150 Ah, 200 Ah." },
    { key: "volts", label: "Battery voltage", type: "select", options: [{ value: "12", label: "12 V" }, { value: "24", label: "24 V" }, { value: "48", label: "48 V" }], default: "12" },
    { key: "count", label: "Number of batteries", type: "number", default: 2, min: 1, max: 16, step: 1 },
    { key: "type", label: "Battery type", type: "select", options: [{ value: "lead", label: "Lead-acid or tubular (use 50%)" }, { value: "lithium", label: "Lithium (LiFePO4, use 80%)" }], default: "lead" },
    { key: "load", label: "Load being run", type: "number", unit: "W", default: 300, min: 1, step: 10, help: "Two fans (150 W) + six LED lights (70 W) + TV (80 W) = 300 W." },
    { key: "efficiency", label: "Inverter efficiency", type: "number", unit: "%", default: 85, min: 50, max: 98, step: 1 },
  ],
  compute(input) {
    const ah = Math.max(0, num(input, "ah", 150));
    const volts = Number(str(input, "volts", "12")) || 12;
    const count = Math.max(1, Math.round(num(input, "count", 2)));
    const dod = str(input, "type", "lead") === "lithium" ? 0.8 : 0.5;
    const load = Math.max(1, num(input, "load", 300));
    const eff = Math.min(0.98, Math.max(0.5, num(input, "efficiency", 85) / 100));
    const storedWh = ah * volts * count;
    const usableWh = storedWh * dod;
    const hours = (usableWh * eff) / load;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    const pretty = hours >= 1 ? `${h} h${m ? ` ${m} min` : ""}` : `${Math.round(hours * 60)} min`;
    const chargeHours = (storedWh * dod) / (volts * count * 0.1 * 0.85) / count;
    return {
      headline: { label: `Backup time at ${number(load)} W`, value: pretty, primary: true },
      summary: `${count} x ${ah} Ah ${volts} V ${dod === 0.8 ? "lithium" : "lead-acid"} stores ${number(storedWh)} Wh; using ${number(dod * 100)}% of it through an inverter at ${number(eff * 100)}% efficiency gives ${number(usableWh * eff)} Wh, which runs ${number(load)} W for about ${pretty}.`,
      sections: [
        {
          title: "Energy",
          lines: [
            { label: "Stored energy", value: `${number(storedWh)} Wh` },
            { label: `Usable (${number(dod * 100)}% depth of discharge)`, value: `${number(usableWh)} Wh` },
            { label: `After inverter losses (${number(eff * 100)}%)`, value: `${number(usableWh * eff)} Wh`, muted: true },
          ],
        },
        {
          title: "Backup at other loads",
          lines: [100, 200, 500, 1000].map((w) => ({ label: `${w} W`, value: `${number((usableWh * eff) / w, 1)} h`, muted: w !== load })),
        },
        {
          title: "Recharge",
          lines: [{ label: "Recharge time from a 10% (C/10) charger", value: `about ${number(chargeHours, 0)} h`, muted: true }],
        },
      ],
      warnings: ["A lead-acid battery run below 50% every day lasts a fraction of its rated cycles; the 50% figure protects it. Old batteries hold less than the label says.", "Motors (fridge, water pump, non-inverter AC) draw several times their running watts at start-up; make sure the inverter, not just the battery, can handle them."],
    };
  },
  methodology: `A battery bank stores *Ah x V x number of batteries* watt-hours. Only part of that is usable: a lead-acid or tubular battery should not be taken below **50%** state of charge on a daily cycle, while lithium iron phosphate packs are rated for **80 to 90%**.

The inverter then loses **10 to 15%** turning DC into 220 V AC. So:

*Backup hours = Ah x V x batteries x depth of discharge x inverter efficiency / load in watts.*

Two 150 Ah 12 V lead-acid batteries with a 300 W load: 3,600 Wh x 0.5 x 0.85 / 300 = about 5 hours.`,
  faqs: [
    { question: "How long will a 150 Ah battery run a fan?", answer: "One 12 V 150 Ah lead-acid battery gives about 765 usable Wh through an inverter. A 75 W ceiling fan runs about 10 hours; two fans and a few LED lights (220 W) about 3.5 hours." },
    { question: "How many batteries do I need for 8 hours of load shedding?", answer: "Work out your load in watts and multiply by 8 for the watt-hours, then divide by 0.5 x 0.85 x 12 V x Ah. For 300 W over 8 hours you need about 470 Ah of 12 V lead-acid, three 150 Ah or two 200 Ah batteries and a bigger inverter to charge them." },
    { question: "Is lithium worth the extra price?", answer: "A lithium pack gives 80% usable capacity, 3,000 or more cycles and weighs a third as much; lead-acid gives 50% usable and 500 to 1,200 cycles. Over five years lithium usually costs less per usable kilowatt-hour." },
    { question: "Why is my backup shorter than calculated?", answer: "Battery age, heat, undercharging before the outage, and loads that draw more than their label (old fans, refrigerators starting) all cut real backup time." },
  ],
  related: { tools: ["electricity-units-calculator", "solar-panel-calculator", "solar-payback-calculator", "electricity-bill-calculator"], entities: ["solar-energy"] },
};
