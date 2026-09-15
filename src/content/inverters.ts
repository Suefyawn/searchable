/**
 * Solar inverter market prices for Pakistan. Dealer / importer quotes (Hall Road Lahore, Saddar Karachi, online
 * retailers) collected 2026-09-15. REVIEW MONTHLY, prices track USD/PKR and container arrivals.
 * Price ranges are for the bare inverter with standard warranty; installation and net-metering kit are extra.
 */

export type InverterType = "hybrid" | "on-grid" | "off-grid";

export type Inverter = {
  id: string;
  brand: string;
  model: string;
  type: InverterType;
  kw: number;
  phase: 1 | 3;
  /** Number of MPPT trackers (independent strings). */
  mppt: number;
  /** Max PV input the inverter accepts, kW. Over-panelling headroom. */
  maxPvKw: number;
  /** Battery bus voltage for hybrid/off-grid; null for on-grid. */
  batteryV: number | null;
  /** Peak efficiency, % */
  efficiency: number;
  /** Standard warranty in years, as sold in Pakistan. */
  warrantyYears: number;
  origin: string;
  /** Rs, dealer range */
  price: [number, number];
  netMetering: boolean;
  wifi: boolean;
  note?: string;
};

export const INVERTERS_REVIEWED_AT = "2026-09-15";
export const INVERTERS_SOURCE = { title: "Searchable market survey: dealer & importer quotes, Lahore/Karachi and online retailers", publisher: "Searchable" };

export const INVERTER_TYPES: Record<InverterType, { name: string; blurb: string }> = {
  hybrid: { name: "Hybrid", blurb: "Runs on solar, grid and battery; keeps the house on during load-shedding and supports net metering. The default choice in Pakistan since 2023." },
  "on-grid": { name: "On-grid", blurb: "Cheapest per kW; exports surplus to the grid for net-metering credits but shuts down when the grid is off. Best where load-shedding is rare." },
  "off-grid": { name: "Off-grid", blurb: "No grid connection needed; runs everything from panels and batteries. For farms, tube wells and areas without WAPDA supply." },
};

export const INVERTERS: Inverter[] = [
  // ── Hybrid ────────────────────────────────────────────────────────────
  { id: "inverex-nitrox-6", brand: "Inverex", model: "Nitrox 6 kW", type: "hybrid", kw: 6, phase: 1, mppt: 2, maxPvKw: 7.8, batteryV: 48, efficiency: 97.6, warrantyYears: 5, origin: "China (Inverex-branded, Pakistani distributor)", price: [175_000, 210_000], netMetering: true, wifi: true, note: "Best-selling 6 kW hybrid; service centres in every major city" },
  { id: "inverex-nitrox-8", brand: "Inverex", model: "Nitrox 8 kW", type: "hybrid", kw: 8, phase: 1, mppt: 2, maxPvKw: 10.4, batteryV: 48, efficiency: 97.6, warrantyYears: 5, origin: "China (Inverex-branded)", price: [235_000, 275_000], netMetering: true, wifi: true },
  { id: "inverex-nitrox-12-3p", brand: "Inverex", model: "Nitrox 12 kW three-phase", type: "hybrid", kw: 12, phase: 3, mppt: 2, maxPvKw: 15.6, batteryV: 48, efficiency: 97.8, warrantyYears: 5, origin: "China (Inverex-branded)", price: [380_000, 440_000], netMetering: true, wifi: true },
  { id: "ziewnic-xtreme-6", brand: "Ziewnic", model: "Xtreme 6 kW", type: "hybrid", kw: 6, phase: 1, mppt: 2, maxPvKw: 7.5, batteryV: 48, efficiency: 97.5, warrantyYears: 5, origin: "China (Ziewnic-branded, Pakistani distributor)", price: [160_000, 195_000], netMetering: true, wifi: true, note: "Aggressive pricing; pairs with Ziewnic lithium batteries" },
  { id: "ziewnic-xtreme-10-3p", brand: "Ziewnic", model: "Xtreme 10 kW three-phase", type: "hybrid", kw: 10, phase: 3, mppt: 2, maxPvKw: 13, batteryV: 48, efficiency: 97.6, warrantyYears: 5, origin: "China (Ziewnic-branded)", price: [310_000, 360_000], netMetering: true, wifi: true },
  { id: "solis-s6-eh1p-6", brand: "Solis", model: "S6-EH1P 6 kW", type: "hybrid", kw: 6, phase: 1, mppt: 2, maxPvKw: 9.6, batteryV: 48, efficiency: 97.8, warrantyYears: 5, origin: "China (Ginlong)", price: [230_000, 275_000], netMetering: true, wifi: true, note: "Tier-1 global brand; strong grid-code compliance for net metering" },
  { id: "solis-s6-eh3p-10", brand: "Solis", model: "S6-EH3P 10 kW three-phase", type: "hybrid", kw: 10, phase: 3, mppt: 2, maxPvKw: 16, batteryV: 48, efficiency: 98, warrantyYears: 5, origin: "China (Ginlong)", price: [420_000, 490_000], netMetering: true, wifi: true },
  { id: "deye-sun-5k", brand: "Deye", model: "SUN-5K-SG03LP1 5 kW", type: "hybrid", kw: 5, phase: 1, mppt: 2, maxPvKw: 6.5, batteryV: 48, efficiency: 97.6, warrantyYears: 5, origin: "China", price: [190_000, 230_000], netMetering: true, wifi: true, note: "Popular with installers for parallel stacking and generator input" },
  { id: "deye-sun-12k-3p", brand: "Deye", model: "SUN-12K-SG04LP3 12 kW three-phase", type: "hybrid", kw: 12, phase: 3, mppt: 2, maxPvKw: 15.6, batteryV: 48, efficiency: 97.6, warrantyYears: 5, origin: "China", price: [430_000, 500_000], netMetering: true, wifi: true },
  { id: "growatt-sph-6", brand: "Growatt", model: "SPH 6000 6 kW", type: "hybrid", kw: 6, phase: 1, mppt: 2, maxPvKw: 9, batteryV: 48, efficiency: 97.5, warrantyYears: 5, origin: "China", price: [210_000, 250_000], netMetering: true, wifi: true },
  { id: "sunlife-6", brand: "Sunlife", model: "Hybrid 6 kW", type: "hybrid", kw: 6, phase: 1, mppt: 2, maxPvKw: 7.5, batteryV: 48, efficiency: 97, warrantyYears: 3, origin: "China (Pakistani brand)", price: [140_000, 170_000], netMetering: true, wifi: true, note: "Budget hybrid; check warranty terms and service coverage in your city" },
  { id: "tiger-6", brand: "Tiger", model: "Hybrid 6 kW", type: "hybrid", kw: 6, phase: 1, mppt: 2, maxPvKw: 7.5, batteryV: 48, efficiency: 97, warrantyYears: 3, origin: "China (Pakistani brand)", price: [135_000, 165_000], netMetering: true, wifi: true, note: "Budget hybrid" },
  { id: "huawei-sun2000-5k-l1", brand: "Huawei", model: "SUN2000-5KTL-L1 5 kW", type: "hybrid", kw: 5, phase: 1, mppt: 2, maxPvKw: 7.5, batteryV: 450, efficiency: 98.4, warrantyYears: 10, origin: "China", price: [260_000, 310_000], netMetering: true, wifi: true, note: "High-voltage LUNA battery only; longest standard warranty" },
  { id: "livoltek-hyt-6", brand: "Livoltek", model: "HYT 6 kW", type: "hybrid", kw: 6, phase: 1, mppt: 2, maxPvKw: 9, batteryV: 48, efficiency: 97.5, warrantyYears: 5, origin: "China", price: [165_000, 200_000], netMetering: true, wifi: true },

  // ── On-grid ───────────────────────────────────────────────────────────
  { id: "solis-s6-gr1p-5", brand: "Solis", model: "S6-GR1P 5 kW", type: "on-grid", kw: 5, phase: 1, mppt: 2, maxPvKw: 8, batteryV: null, efficiency: 98.3, warrantyYears: 5, origin: "China (Ginlong)", price: [95_000, 120_000], netMetering: true, wifi: true, note: "Most common on-grid inverter on Pakistani net-metering approvals" },
  { id: "solis-s5-gr3p-10", brand: "Solis", model: "S5-GR3P 10 kW three-phase", type: "on-grid", kw: 10, phase: 3, mppt: 2, maxPvKw: 15, batteryV: null, efficiency: 98.5, warrantyYears: 5, origin: "China (Ginlong)", price: [165_000, 200_000], netMetering: true, wifi: true },
  { id: "growatt-mic-5", brand: "Growatt", model: "MIN 5000TL-X 5 kW", type: "on-grid", kw: 5, phase: 1, mppt: 2, maxPvKw: 7.5, batteryV: null, efficiency: 98.4, warrantyYears: 5, origin: "China", price: [90_000, 115_000], netMetering: true, wifi: true },
  { id: "growatt-mod-10-3p", brand: "Growatt", model: "MOD 10KTL3-X 10 kW three-phase", type: "on-grid", kw: 10, phase: 3, mppt: 2, maxPvKw: 15, batteryV: null, efficiency: 98.6, warrantyYears: 5, origin: "China", price: [160_000, 195_000], netMetering: true, wifi: true },
  { id: "sungrow-sg5", brand: "Sungrow", model: "SG5.0RS 5 kW", type: "on-grid", kw: 5, phase: 1, mppt: 2, maxPvKw: 7.5, batteryV: null, efficiency: 98.4, warrantyYears: 5, origin: "China", price: [110_000, 135_000], netMetering: true, wifi: true },
  { id: "sungrow-sg10rt", brand: "Sungrow", model: "SG10RT 10 kW three-phase", type: "on-grid", kw: 10, phase: 3, mppt: 2, maxPvKw: 15, batteryV: null, efficiency: 98.6, warrantyYears: 5, origin: "China", price: [200_000, 240_000], netMetering: true, wifi: true },
  { id: "huawei-sun2000-10ktl", brand: "Huawei", model: "SUN2000-10KTL-M1 10 kW three-phase", type: "on-grid", kw: 10, phase: 3, mppt: 2, maxPvKw: 15, batteryV: null, efficiency: 98.6, warrantyYears: 10, origin: "China", price: [235_000, 280_000], netMetering: true, wifi: true, note: "Optimiser-ready; 10-year warranty" },
  { id: "goodwe-dns-5", brand: "GoodWe", model: "GW5000-DNS-30 5 kW", type: "on-grid", kw: 5, phase: 1, mppt: 2, maxPvKw: 7.5, batteryV: null, efficiency: 98.2, warrantyYears: 5, origin: "China", price: [100_000, 125_000], netMetering: true, wifi: true },
  { id: "fronius-primo-5", brand: "Fronius", model: "Primo 5.0-1 5 kW", type: "on-grid", kw: 5, phase: 1, mppt: 2, maxPvKw: 7.5, batteryV: null, efficiency: 98.1, warrantyYears: 5, origin: "Austria", price: [260_000, 320_000], netMetering: true, wifi: true, note: "European build; premium price, limited local service" },
  { id: "inverex-aerox-5", brand: "Inverex", model: "Aerox 5 kW on-grid", type: "on-grid", kw: 5, phase: 1, mppt: 2, maxPvKw: 7.5, batteryV: null, efficiency: 98, warrantyYears: 5, origin: "China (Inverex-branded)", price: [95_000, 120_000], netMetering: true, wifi: true },

  // ── Off-grid ──────────────────────────────────────────────────────────
  { id: "inverex-veyron-3", brand: "Inverex", model: "Veyron II 3.2 kW", type: "off-grid", kw: 3.2, phase: 1, mppt: 1, maxPvKw: 4, batteryV: 24, efficiency: 93, warrantyYears: 2, origin: "China (Inverex-branded)", price: [65_000, 85_000], netMetering: false, wifi: true, note: "Entry-level; runs fans, lights, one AC with 24 V batteries" },
  { id: "inverex-veyron-6", brand: "Inverex", model: "Veyron II 6.2 kW", type: "off-grid", kw: 6.2, phase: 1, mppt: 1, maxPvKw: 8, batteryV: 48, efficiency: 93, warrantyYears: 2, origin: "China (Inverex-branded)", price: [110_000, 135_000], netMetering: false, wifi: true },
  { id: "ziewnic-x2-3", brand: "Ziewnic", model: "X-Core 3.5 kW", type: "off-grid", kw: 3.5, phase: 1, mppt: 1, maxPvKw: 4.5, batteryV: 24, efficiency: 93, warrantyYears: 2, origin: "China (Ziewnic-branded)", price: [60_000, 78_000], netMetering: false, wifi: true },
  { id: "crown-xavier-3", brand: "Crown Micro", model: "Xavier 3.5 kW", type: "off-grid", kw: 3.5, phase: 1, mppt: 1, maxPvKw: 4.5, batteryV: 24, efficiency: 93, warrantyYears: 2, origin: "China", price: [55_000, 72_000], netMetering: false, wifi: false, note: "Cheapest way to run solar without WAPDA; not net-meterable" },
  { id: "knox-infini-6", brand: "Knox", model: "Infini 6 kW", type: "off-grid", kw: 6, phase: 1, mppt: 1, maxPvKw: 7.5, batteryV: 48, efficiency: 93, warrantyYears: 2, origin: "China (Pakistani brand)", price: [95_000, 120_000], netMetering: false, wifi: true },
  { id: "homage-hvs-5", brand: "Homage", model: "HVS 5.5 kW", type: "off-grid", kw: 5.5, phase: 1, mppt: 1, maxPvKw: 6.5, batteryV: 48, efficiency: 93, warrantyYears: 2, origin: "China (Pakistani brand)", price: [85_000, 110_000], netMetering: false, wifi: true },
];

/** Lithium batteries commonly paired with 48 V hybrids. */
export const BATTERIES = [
  { brand: "Ziewnic", model: "5.12 kWh LiFePO4 (48 V)", kwh: 5.12, price: [180_000, 220_000] as [number, number], warrantyYears: 5 },
  { brand: "Inverex", model: "Pylontech-type 5 kWh (48 V)", kwh: 5, price: [210_000, 260_000] as [number, number], warrantyYears: 5 },
  { brand: "Pylontech", model: "US5000 4.8 kWh", kwh: 4.8, price: [260_000, 320_000] as [number, number], warrantyYears: 7 },
  { brand: "Deye / Dyness", model: "5.12 kWh rack (48 V)", kwh: 5.12, price: [200_000, 250_000] as [number, number], warrantyYears: 5 },
  { brand: "Huawei", model: "LUNA2000 5 kWh (high voltage)", kwh: 5, price: [380_000, 450_000] as [number, number], warrantyYears: 10 },
];
