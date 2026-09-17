import { REFERENCE_RATES } from "../data/rates";
import { num, type ToolDefinition } from "../types";
import { number, pkr } from "@/lib/format";

/** System losses between panel rating and AC output: inverter, temperature, dust, wiring. */
const DERATE = 0.8;
/** Common inverter sizes sold in Pakistan, kW. */
const INVERTERS = [3, 5, 6, 8, 10, 12, 15, 20, 25, 30];
/** Roof area per panel, square feet, including walkway spacing (a 585 W panel is about 1.13 x 2.28 m). */
const SQFT_PER_PANEL = 30;

export const solarPanelCalculator: ToolDefinition = {
  slug: "solar-panel-calculator",
  category: "solar",
  name: "Solar Panel Calculator: How Many Panels You Need",
  seoTitle: "Solar Panel Calculator Pakistan: How Many Panels, What Size Inverter and Roof Area for Your Units",
  shortName: "Panels needed",
  description: "From your monthly electricity units, the number of solar panels you need, the system size in kW, the inverter to buy, the roof area it takes and the panel cost at today's per-watt price.",
  keywords: ["solar panel calculator", "solar calculator", "solar system calculator", "how many solar panels do i need", "solar panel calculator pakistan", "solar system size calculator", "how many panels for 5kw", "solar inverter size calculator", "solar panels for 500 units", "roof area for solar panels"],
  version: "1.0.0",
  lastReviewed: REFERENCE_RATES.reviewedAt,
  sources: [{ title: "Solar panel price per watt in Pakistan, dealer survey, from the Searchable data hub", url: "https://searchable.pk/data/solar-panel-price", publisher: "Searchable" }, { title: "Global Solar Atlas: photovoltaic power potential for Pakistani cities", url: "https://globalsolaratlas.info/", publisher: "World Bank / Solargis" }],
  fields: [
    { key: "units", label: "Monthly consumption", type: "number", unit: "kWh", default: 600, min: 30, step: 10, help: "Average of your last 12 bills, or use the Units calculator." },
    { key: "coverage", label: "Share of consumption to cover", type: "number", unit: "%", default: 100, min: 10, max: 150, step: 5, help: "Over 100% if you want to export more under net metering." },
    { key: "panelWatts", label: "Panel wattage", type: "number", unit: "W", default: 585, min: 100, max: 800, step: 5, help: "Tier-1 panels sold in 2026 are 550 to 620 W." },
    { key: "sunHours", label: "Peak sun hours per day", type: "number", default: 4.5, min: 3, max: 6.5, step: 0.1, help: "Lahore 4.5, Karachi 5, Islamabad 4.6, Quetta 5.5, Multan 5" },
    { key: "perWatt", label: "Panel price per watt", type: "number", unit: "PKR", default: 29, min: 5, step: 0.5, help: "Filled from the data hub's dealer survey; panels only, not the inverter or structure." },
  ],
  compute(input) {
    const units = Math.max(0, num(input, "units", 600));
    const coverage = Math.max(0.1, num(input, "coverage", 100) / 100);
    const panelWatts = Math.max(50, num(input, "panelWatts", 585));
    const sunHours = Math.max(1, num(input, "sunHours", 4.5));
    const perWatt = Math.max(0, num(input, "perWatt", 29));
    const dailyKwh = (units * coverage) / 30;
    const kwNeeded = dailyKwh / (sunHours * DERATE);
    const panels = Math.max(1, Math.ceil((kwNeeded * 1000) / panelWatts));
    const arrayKw = (panels * panelWatts) / 1000;
    const inverter = INVERTERS.find((i) => i >= arrayKw * 0.85) ?? Math.ceil(arrayKw);
    const generation = arrayKw * sunHours * DERATE * 30;
    const roof = panels * SQFT_PER_PANEL;
    const panelCost = panels * panelWatts * perWatt;
    return {
      headline: { label: "Panels needed", value: `${panels} x ${panelWatts} W`, primary: true },
      summary: `To cover ${number(units * coverage)} units a month at ${number(sunHours, 1)} peak sun hours you need about ${number(kwNeeded, 1)} kW of panels: ${panels} panels of ${panelWatts} W (${number(arrayKw, 2)} kW), a ${inverter} kW inverter and roughly ${number(roof)} square feet of roof. The panels alone cost about ${pkr(panelCost)} at ${pkr(perWatt)} per watt.`,
      sections: [
        {
          title: "System",
          lines: [
            { label: "Array size", value: `${number(arrayKw, 2)} kW`, primary: true },
            { label: "Inverter (hybrid or on-grid)", value: `${inverter} kW` },
            { label: "Roof area, panels plus walkways", value: `${number(roof)} sq ft (${number(roof / 272.25, 1)} marla)` },
            { label: "Expected generation", value: `${number(generation)} units a month`, muted: true },
          ],
        },
        {
          title: "Cost",
          lines: [
            { label: `Panels (${panels} x ${panelWatts} W at ${pkr(perWatt)}/W)`, value: pkr(panelCost) },
            { label: "Inverter, structure, wiring, installation", value: "see the Solar Payback calculator", muted: true },
          ],
        },
      ],
      warnings: ["Generation assumes 20% system losses and panels facing south at about 25 degrees. Shade from a water tank or the neighbour's wall can cost a fifth of the output.", "A net-metering connection is capped by your sanctioned load; DISCOs approve up to the sanctioned load in kW, so a 10 kW system needs a 10 kW connection."],
    };
  },
  methodology: `Divide the monthly units you want to cover by 30 for the **daily need**. A panel array produces its rated kW times the **peak sun hours** of the site (4.5 to 5.5 across Pakistan) times a **derate of 0.8** for inverter, heat, dust and wiring losses. So:

*Array kW = daily kWh / (peak sun hours x 0.8)*, and *panels = array watts / panel watts*, rounded up.

The inverter is sized at about 85% of the array (panels rarely produce their full rating at once), rounded up to the sizes sold here. Roof area allows 30 square feet per 585 W panel including spacing; 272.25 square feet make a marla.`,
  faqs: [
    { question: "How many solar panels do I need for 500 units?", answer: "About 4.6 kW: 8 panels of 585 W in Lahore (4.5 sun hours) or 7 in Karachi. Pair them with a 5 kW inverter." },
    { question: "How many panels make a 5 kW system?", answer: "Nine 550 W panels or eight 585 W panels give 5 kW. Older 400 W panels needed 13." },
    { question: "What size inverter for 10 panels?", answer: "Ten 585 W panels are 5.85 kW; a 5 or 6 kW inverter suits them, since panels seldom deliver their full rating together." },
    { question: "How much roof space does a 5 kW system need?", answer: "About 250 square feet with walkways, a little under a marla, for eight or nine large panels." },
  ],
  related: { tools: ["solar-payback-calculator", "electricity-units-calculator", "battery-backup-calculator", "electricity-bill-calculator"], guides: [], entities: ["solar-energy"] },
};
