/**
 * Solar market prices for Pakistan. Market-survey data (importer/dealer quotes in Lahore & Karachi).
 * REVIEW WEEKLY. Per-watt prices move with USD/PKR and Chinese module prices.
 */
export const SOLAR_PRICES = {
  reviewedAt: "2026-09-15",
  source: { title: "Searchable market survey — importer & dealer quotes, Lahore/Karachi (Hall Road, Saddar)", publisher: "Searchable" },
  /** Rs per watt for a full pallet / dealer price. Retail single-panel prices run 5–10% higher. */
  panels: [
    { brand: "Longi Hi-MO 6/7", tier: "Tier 1 (A-grade)", watts: 580, perWatt: 29, note: "Most common on rooftops in 2026" },
    { brand: "Jinko Tiger Neo N-type", tier: "Tier 1 (A-grade)", watts: 585, perWatt: 30, note: "Bifacial N-type; best in heat" },
    { brand: "JA Solar Deep Blue 4.0", tier: "Tier 1 (A-grade)", watts: 580, perWatt: 28.5 },
    { brand: "Canadian Solar HiKu7", tier: "Tier 1 (A-grade)", watts: 600, perWatt: 30.5 },
    { brand: "Trina Vertex", tier: "Tier 1 (A-grade)", watts: 590, perWatt: 29.5 },
    { brand: "Astronergy / Risen", tier: "Tier 1 (A-grade)", watts: 580, perWatt: 27.5 },
    { brand: "Generic B-grade / used", tier: "B-grade", watts: 550, perWatt: 22, note: "No warranty support; avoid for net metering" },
  ],
  inverters: [
    { type: "On-grid 5 kW (Solis, Growatt, Sungrow)", price: [95_000, 140_000] },
    { type: "On-grid 10 kW", price: [160_000, 240_000] },
    { type: "Hybrid 5–6 kW (Inverex, Solis, Deye)", price: [170_000, 280_000] },
    { type: "Hybrid 10–12 kW", price: [300_000, 480_000] },
    { type: "Lithium battery 5 kWh (LiFePO4)", price: [180_000, 320_000] },
  ],
  /** Installed system estimates (panels + on-grid inverter + structure + wiring + labour). */
  systems: [
    { kw: 3, range: [380_000, 520_000] },
    { kw: 5, range: [550_000, 800_000] },
    { kw: 10, range: [1_050_000, 1_500_000] },
    { kw: 15, range: [1_550_000, 2_200_000] },
    { kw: 20, range: [2_000_000, 2_800_000] },
  ],
};
