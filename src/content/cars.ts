/**
 * New cars on sale in Pakistan with indicative ex-factory prices. Prices are the published dealer/assembler
 * price list as aggregated by PakWheels on the review date; assemblers revise them with the rupee and budget,
 * so REVIEW MONTHLY. Specs are the base-to-top variant span. Prices in PKR.
 */

export type Body = "hatchback" | "sedan" | "crossover" | "suv" | "mpv" | "van" | "pickup";
export type Fuel = "petrol" | "diesel" | "hybrid" | "phev" | "electric";

export type Car = {
  id: string;
  brand: string;
  model: string;
  body: Body;
  fuel: Fuel;
  /** Engine displacement cc (petrol/diesel/hybrid) or battery kWh (electric). */
  engine: number;
  engineLabel: string;
  transmission: string;
  seats: number;
  /** Claimed / typical km per litre (or km per charge for EVs). */
  economy: string;
  airbags: string;
  origin: "Local assembly (CKD)" | "Imported (CBU)";
  price: [number, number];
  variants: number;
  note?: string;
};

export const CARS_REVIEWED_AT = "2026-09-15";
export const CARS_SOURCE = { title: "Assembler and importer price lists as aggregated by PakWheels (new cars)", url: "https://www.pakwheels.com/new-cars/", publisher: "PakWheels" };

const L = 100_000;

export const CARS: Car[] = [
  // ── Suzuki (Pak Suzuki) ────────────────────────────────────────────
  { id: "suzuki-alto", brand: "Suzuki", model: "Alto", body: "hatchback", fuel: "petrol", engine: 660, engineLabel: "660 cc", transmission: "Manual / AGS", seats: 4, economy: "18–22 km/l", airbags: "2", origin: "Local assembly (CKD)", price: [29.95 * L, 33.26 * L], variants: 3, note: "Pakistan's best-selling car; VX, VXR, VXL AGS" },
  { id: "suzuki-every", brand: "Suzuki", model: "Every", body: "van", fuel: "petrol", engine: 660, engineLabel: "660 cc", transmission: "Manual", seats: 7, economy: "14–16 km/l", airbags: "2", origin: "Local assembly (CKD)", price: [29.65 * L, 29.65 * L], variants: 1, note: "Replaced the Bolan in 2025" },
  { id: "suzuki-cultus", brand: "Suzuki", model: "Cultus", body: "hatchback", fuel: "petrol", engine: 998, engineLabel: "1.0 L", transmission: "Manual / AGS", seats: 5, economy: "15–18 km/l", airbags: "2", origin: "Local assembly (CKD)", price: [43.59 * L, 43.59 * L], variants: 1 },
  { id: "suzuki-swift", brand: "Suzuki", model: "Swift", body: "hatchback", fuel: "petrol", engine: 1197, engineLabel: "1.2 L", transmission: "CVT", seats: 5, economy: "15–17 km/l", airbags: "2–6", origin: "Local assembly (CKD)", price: [44.6 * L, 47.66 * L], variants: 3 },
  { id: "suzuki-fronx", brand: "Suzuki", model: "Fronx", body: "crossover", fuel: "petrol", engine: 998, engineLabel: "1.0 L turbo / 1.5 L", transmission: "Automatic", seats: 5, economy: "15–18 km/l", airbags: "6", origin: "Imported (CBU)", price: [60 * L, 70.75 * L], variants: 2, note: "Launched 2025" },

  // ── Toyota (Indus Motor) ───────────────────────────────────────────
  { id: "toyota-yaris", brand: "Toyota", model: "Yaris", body: "sedan", fuel: "petrol", engine: 1329, engineLabel: "1.3 L / 1.5 L", transmission: "Manual / CVT", seats: 5, economy: "13–16 km/l", airbags: "2–7", origin: "Local assembly (CKD)", price: [46.49 * L, 60.49 * L], variants: 6 },
  { id: "toyota-corolla", brand: "Toyota", model: "Corolla", body: "sedan", fuel: "petrol", engine: 1598, engineLabel: "1.6 L / 1.8 L", transmission: "Manual / CVT", seats: 5, economy: "12–14 km/l", airbags: "2–7", origin: "Local assembly (CKD)", price: [62.02 * L, 77.09 * L], variants: 5, note: "Altis 1.6, 1.8 and Grande" },
  { id: "toyota-corolla-cross", brand: "Toyota", model: "Corolla Cross", body: "crossover", fuel: "hybrid", engine: 1798, engineLabel: "1.8 L hybrid", transmission: "e-CVT", seats: 5, economy: "20–23 km/l", airbags: "7", origin: "Local assembly (CKD)", price: [72.35 * L, 102.99 * L], variants: 4, note: "Locally assembled hybrid" },
  { id: "toyota-hilux", brand: "Toyota", model: "Hilux", body: "pickup", fuel: "diesel", engine: 2755, engineLabel: "2.8 L diesel", transmission: "Manual / Automatic", seats: 5, economy: "9–11 km/l", airbags: "3–7", origin: "Local assembly (CKD)", price: [113.79 * L, 158.39 * L], variants: 4 },
  { id: "toyota-fortuner", brand: "Toyota", model: "Fortuner", body: "suv", fuel: "diesel", engine: 2755, engineLabel: "2.7 L petrol / 2.8 L diesel", transmission: "Automatic", seats: 7, economy: "8–11 km/l", airbags: "7", origin: "Local assembly (CKD)", price: [124.35 * L, 204.99 * L], variants: 5, note: "Legender and GR-S at the top" },

  // ── Honda (Honda Atlas) ────────────────────────────────────────────
  { id: "honda-city", brand: "Honda", model: "City", body: "sedan", fuel: "petrol", engine: 1199, engineLabel: "1.2 L / 1.5 L", transmission: "Manual / CVT", seats: 5, economy: "13–16 km/l", airbags: "2–6", origin: "Local assembly (CKD)", price: [47.37 * L, 61.49 * L], variants: 5 },
  { id: "honda-hrv", brand: "Honda", model: "HR-V", body: "crossover", fuel: "petrol", engine: 1498, engineLabel: "1.5 L", transmission: "CVT", seats: 5, economy: "13–15 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [75.49 * L, 103.69 * L], variants: 3 },
  { id: "honda-civic", brand: "Honda", model: "Civic", body: "sedan", fuel: "petrol", engine: 1498, engineLabel: "1.5 L turbo", transmission: "CVT", seats: 5, economy: "11–14 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [84.99 * L, 101 * L], variants: 3, note: "RS at the top" },

  // ── Hyundai (Nishat) ───────────────────────────────────────────────
  { id: "hyundai-elantra", brand: "Hyundai", model: "Elantra", body: "sedan", fuel: "petrol", engine: 1999, engineLabel: "2.0 L", transmission: "Automatic", seats: 5, economy: "11–13 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [107.61 * L, 107.61 * L], variants: 1 },
  { id: "hyundai-sonata", brand: "Hyundai", model: "Sonata", body: "sedan", fuel: "petrol", engine: 1999, engineLabel: "2.0 L / 2.5 L", transmission: "Automatic", seats: 5, economy: "10–12 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [115.45 * L, 165.21 * L], variants: 3 },
  { id: "hyundai-tucson", brand: "Hyundai", model: "Tucson", body: "suv", fuel: "petrol", engine: 1999, engineLabel: "2.0 L", transmission: "Automatic", seats: 5, economy: "10–12 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [122.02 * L, 133 * L], variants: 2 },
  { id: "hyundai-santa-fe", brand: "Hyundai", model: "Santa Fe", body: "suv", fuel: "petrol", engine: 2497, engineLabel: "2.5 L", transmission: "Automatic", seats: 7, economy: "9–11 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [132.58 * L, 147.2 * L], variants: 2 },

  // ── Kia (Lucky Motor) ──────────────────────────────────────────────
  { id: "kia-stonic", brand: "Kia", model: "Stonic", body: "crossover", fuel: "petrol", engine: 1368, engineLabel: "1.4 L", transmission: "Automatic", seats: 5, economy: "12–14 km/l", airbags: "2", origin: "Local assembly (CKD)", price: [59.99 * L, 59.99 * L], variants: 1 },
  { id: "kia-sportage-l", brand: "Kia", model: "Sportage L", body: "suv", fuel: "petrol", engine: 1999, engineLabel: "2.0 L", transmission: "Automatic", seats: 5, economy: "10–12 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [121.99 * L, 132.99 * L], variants: 2, note: "New-generation Sportage" },
  { id: "kia-sorento", brand: "Kia", model: "Sorento", body: "suv", fuel: "petrol", engine: 2497, engineLabel: "2.5 L / 3.5 L", transmission: "Automatic", seats: 7, economy: "8–10 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [136.49 * L, 189.99 * L], variants: 3 },
  { id: "kia-ev5", brand: "Kia", model: "EV5", body: "suv", fuel: "electric", engine: 88, engineLabel: "88 kWh", transmission: "Single-speed", seats: 5, economy: "~500 km/charge", airbags: "7", origin: "Imported (CBU)", price: [168.5 * L, 218.5 * L], variants: 2 },

  // ── Changan (Master Motors) ────────────────────────────────────────
  { id: "changan-karvaan", brand: "Changan", model: "Karvaan", body: "van", fuel: "petrol", engine: 998, engineLabel: "1.0 L", transmission: "Manual", seats: 7, economy: "12–14 km/l", airbags: "0–2", origin: "Local assembly (CKD)", price: [29.49 * L, 32.49 * L], variants: 2 },
  { id: "changan-alsvin", brand: "Changan", model: "Alsvin", body: "sedan", fuel: "petrol", engine: 1370, engineLabel: "1.4 L / 1.5 L", transmission: "Manual / DCT", seats: 5, economy: "13–15 km/l", airbags: "2–4", origin: "Local assembly (CKD)", price: [41.89 * L, 49.99 * L], variants: 3, note: "Cheapest new sedan" },
  { id: "changan-oshan-x7", brand: "Changan", model: "Oshan X7", body: "suv", fuel: "petrol", engine: 1498, engineLabel: "1.5 L turbo", transmission: "DCT", seats: 7, economy: "10–12 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [79.49 * L, 84.49 * L], variants: 2 },

  // ── MG (JW-SEZ) ────────────────────────────────────────────────────
  { id: "mg-binguo", brand: "MG", model: "Binguo", body: "hatchback", fuel: "electric", engine: 37, engineLabel: "37 kWh", transmission: "Single-speed", seats: 5, economy: "~330 km/charge", airbags: "4", origin: "Imported (CBU)", price: [56.99 * L, 56.99 * L], variants: 1, note: "Cheapest EV on sale" },
  { id: "mg-zs", brand: "MG", model: "ZS", body: "crossover", fuel: "petrol", engine: 1498, engineLabel: "1.5 L", transmission: "Automatic", seats: 5, economy: "11–13 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [65.99 * L, 74.99 * L], variants: 2 },
  { id: "mg-4", brand: "MG", model: "MG4", body: "hatchback", fuel: "electric", engine: 51, engineLabel: "51 kWh", transmission: "Single-speed", seats: 5, economy: "~350 km/charge", airbags: "6", origin: "Imported (CBU)", price: [69.99 * L, 69.99 * L], variants: 1 },
  { id: "mg-hs", brand: "MG", model: "HS", body: "suv", fuel: "petrol", engine: 1490, engineLabel: "1.5 L turbo", transmission: "DCT", seats: 5, economy: "10–12 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [88 * L, 101.99 * L], variants: 3, note: "PHEV variant imported" },

  // ── Haval / GWM (Sazgar) ───────────────────────────────────────────
  { id: "haval-jolion", brand: "Haval", model: "Jolion", body: "crossover", fuel: "petrol", engine: 1498, engineLabel: "1.5 L turbo / HEV", transmission: "DCT", seats: 5, economy: "11–16 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [77.96 * L, 91.16 * L], variants: 3 },
  { id: "haval-h6", brand: "Haval", model: "H6", body: "suv", fuel: "hybrid", engine: 1498, engineLabel: "1.5 L turbo / 2.0 L / HEV", transmission: "DCT", seats: 5, economy: "10–18 km/l", airbags: "6", origin: "Local assembly (CKD)", price: [89.24 * L, 129 * L], variants: 4, note: "Locally assembled HEV" },

  // ── BYD (Mega Motors) ──────────────────────────────────────────────
  { id: "byd-atto-2", brand: "BYD", model: "Atto 2", body: "crossover", fuel: "electric", engine: 51, engineLabel: "51 kWh", transmission: "Single-speed", seats: 5, economy: "~400 km/charge", airbags: "6", origin: "Imported (CBU)", price: [72.9 * L, 72.9 * L], variants: 1 },
  { id: "byd-atto-3", brand: "BYD", model: "Atto 3", body: "crossover", fuel: "electric", engine: 60, engineLabel: "60 kWh", transmission: "Single-speed", seats: 5, economy: "~420 km/charge", airbags: "7", origin: "Imported (CBU)", price: [89.9 * L, 89.9 * L], variants: 1 },
  { id: "byd-seal", brand: "BYD", model: "Seal", body: "sedan", fuel: "electric", engine: 83, engineLabel: "83 kWh", transmission: "Single-speed", seats: 5, economy: "~550 km/charge", airbags: "9", origin: "Imported (CBU)", price: [147.9 * L, 169.9 * L], variants: 2 },
  { id: "byd-sealion-7", brand: "BYD", model: "Sealion 7", body: "suv", fuel: "electric", engine: 83, engineLabel: "83 kWh", transmission: "Single-speed", seats: 5, economy: "~500 km/charge", airbags: "9", origin: "Imported (CBU)", price: [154.9 * L, 154.9 * L], variants: 1 },
  { id: "byd-shark-6", brand: "BYD", model: "Shark 6", body: "pickup", fuel: "phev", engine: 1497, engineLabel: "1.5 L turbo PHEV", transmission: "Automatic", seats: 5, economy: "~100 km EV + petrol", airbags: "7", origin: "Imported (CBU)", price: [199.5 * L, 199.5 * L], variants: 1 },
];

export const BODY_LABELS: Record<Body, string> = { hatchback: "Hatchback", sedan: "Sedan", crossover: "Crossover", suv: "SUV", mpv: "MPV", van: "Van", pickup: "Pickup" };
export const FUEL_LABELS: Record<Fuel, string> = { petrol: "Petrol", diesel: "Diesel", hybrid: "Hybrid", phev: "Plug-in hybrid", electric: "Electric" };
