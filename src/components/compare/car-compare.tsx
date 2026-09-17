"use client";

import { Comparator, type CompareConfig } from "@/components/compare/comparator";
import { BODY_LABELS, FUEL_LABELS, type Body, type Car, type Fuel } from "@/content/cars";
import { pkrCompact } from "@/lib/format";

const priceRange = (c: Car) => (c.price[0] === c.price[1] ? pkrCompact(c.price[0]) : `${pkrCompact(c.price[0])} to ${pkrCompact(c.price[1])}`);
/** Typical city km per litre from the published range; electric cars are ranked first on running cost. */
const kmpl = (c: Car) => (c.fuel === "electric" ? 99 : parseFloat(c.economy) || 0);
const airbags = (c: Car) => parseInt(c.airbags, 10) || 0;

export function CarCompare({ cars }: { cars: Car[] }) {
  const bodies = [...new Set(cars.map((c) => c.body))] as Body[];
  const fuels = [...new Set(cars.map((c) => c.fuel))] as Fuel[];
  const config: CompareConfig<Car> = {
    noun: "car",
    id: (c) => c.id,
    title: (c) => `${c.brand} ${c.model}`,
    subtitle: (c) => `${c.variants} variant${c.variants > 1 ? "s" : ""} · ${c.origin === "Imported (CBU)" ? "imported" : "local assembly"}${c.note ? ` · ${c.note}` : ""}`,
    price: priceRange,
    priceNum: (c) => c.price[0],
    searchText: (c) => `${c.brand} ${c.model} ${c.engineLabel} ${BODY_LABELS[c.body]} ${FUEL_LABELS[c.fuel]} ${c.note ?? ""}`,
    specs: [
      { key: "body", label: "Body", get: (c) => BODY_LABELS[c.body], column: true },
      { key: "engine", label: "Engine", get: (c) => `${c.engineLabel}${c.fuel !== "petrol" ? ` · ${FUEL_LABELS[c.fuel]}` : ""}`, card: true, column: true },
      { key: "gearbox", label: "Gearbox", get: (c) => c.transmission, card: true, column: true },
      { key: "economy", label: "Economy", get: (c) => c.economy, num: kmpl, best: "max", card: true, column: true, align: "right" },
      { key: "airbags", label: "Airbags", get: (c) => c.airbags, num: airbags, best: "max", card: true },
      { key: "seats", label: "Seats", get: (c) => String(c.seats), num: (c) => c.seats, best: "max" },
      { key: "fuel", label: "Fuel", get: (c) => FUEL_LABELS[c.fuel] },
      { key: "origin", label: "Assembly", get: (c) => c.origin },
      { key: "variants", label: "Variants", get: (c) => String(c.variants) },
    ],
    filters: [
      { key: "body", label: "Body", options: bodies.map((b) => ({ value: b, label: BODY_LABELS[b], test: (c) => c.body === b })) },
      { key: "fuel", label: "Fuel", options: fuels.map((f) => ({ value: f, label: FUEL_LABELS[f], test: (c) => c.fuel === f })) },
      {
        key: "budget",
        label: "Budget",
        options: [
          { value: "40", label: "Under Rs 40 lakh", test: (c) => c.price[0] < 40e5 },
          { value: "60", label: "40 to 60 lakh", test: (c) => c.price[0] >= 40e5 && c.price[0] < 60e5 },
          { value: "100", label: "60 lakh to 1 crore", test: (c) => c.price[0] >= 60e5 && c.price[0] < 100e5 },
          { value: "100plus", label: "Over 1 crore", test: (c) => c.price[0] >= 100e5 },
        ],
      },
    ],
    sorts: [
      { key: "price", label: "Price, low to high", compare: (a, b) => a.price[0] - b.price[0] },
      { key: "priceDesc", label: "Price, high to low", compare: (a, b) => b.price[0] - a.price[0] },
      { key: "economy", label: "Fuel economy", compare: (a, b) => kmpl(b) - kmpl(a) },
      { key: "brand", label: "Brand", compare: (a, b) => a.brand.localeCompare(b.brand) || a.price[0] - b.price[0] },
    ],
    actions: (c) => [
      { href: `/tools/cars/car-loan-calculator?price=${c.price[0]}`, label: `Instalment on ${pkrCompact(c.price[0])}` },
      { href: `/tools/cars/token-tax-calculator?cc=${c.fuel === "electric" ? 1000 : c.engine}&invoice=${c.price[0]}`, label: "Token tax" },
      { href: `/tools/cars/fuel-cost-calculator`, label: "Monthly fuel" },
    ],
  };
  return <Comparator items={cars} config={config} />;
}
