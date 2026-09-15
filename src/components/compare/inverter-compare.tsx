"use client";

import { Comparator, type CompareConfig } from "@/components/compare/comparator";
import { INVERTER_TYPES, type Inverter, type InverterType } from "@/content/inverters";
import { pkr } from "@/lib/format";

const mid = (i: Inverter) => (i.price[0] + i.price[1]) / 2;

export function InverterCompare({ inverters }: { inverters: Inverter[] }) {
  const config: CompareConfig<Inverter> = {
    noun: "inverter",
    id: (i) => i.id,
    title: (i) => `${i.brand} ${i.model}`,
    subtitle: (i) => `${INVERTER_TYPES[i.type].name} · ${i.kw} kW ${i.phase === 3 ? "three-phase" : "single-phase"} · ${i.origin}`,
    price: (i) => `${pkr(i.price[0])} to ${pkr(i.price[1])}`,
    priceNum: mid,
    searchText: (i) => `${i.brand} ${i.model} ${INVERTER_TYPES[i.type].name} ${i.kw} kW ${i.origin}`,
    specs: [
      { key: "perkw", label: "Price per kW", get: (i) => pkr(Math.round(mid(i) / i.kw)), num: (i) => mid(i) / i.kw, best: "min", card: true, column: true, align: "right" },
      { key: "output", label: "Rated output", get: (i) => `${i.kw} kW, ${i.phase === 3 ? "3-phase" : "1-phase"}`, num: (i) => i.kw, best: "max", column: true },
      { key: "pv", label: "Max PV input", get: (i) => `${i.maxPvKw} kW`, num: (i) => i.maxPvKw, best: "max", card: true, column: true },
      { key: "mppt", label: "MPPT trackers", get: (i) => String(i.mppt), num: (i) => i.mppt, best: "max" },
      { key: "battery", label: "Battery", get: (i) => (i.batteryV ? `${i.batteryV} V` : "None (on-grid)"), card: true, column: true },
      { key: "eff", label: "Peak efficiency", get: (i) => `${i.efficiency}%`, num: (i) => i.efficiency, best: "max", column: true, align: "right" },
      { key: "warranty", label: "Warranty", get: (i) => `${i.warrantyYears} years`, num: (i) => i.warrantyYears, best: "max", card: true, column: true },
      { key: "net", label: "Net metering", get: (i) => (i.netMetering ? "Yes" : "No"), num: (i) => (i.netMetering ? 1 : 0), best: "max" },
      { key: "wifi", label: "Wi-Fi monitoring", get: (i) => (i.wifi ? "Yes" : "No"), num: (i) => (i.wifi ? 1 : 0), best: "max" },
      { key: "origin", label: "Origin", get: (i) => i.origin },
    ],
    filters: [
      { key: "type", label: "Type", options: (Object.keys(INVERTER_TYPES) as InverterType[]).map((t) => ({ value: t, label: INVERTER_TYPES[t].name, test: (i) => i.type === t })) },
      {
        key: "kw",
        label: "Size",
        options: [
          { value: "3", label: "3 to 4 kW", test: (i) => i.kw < 4.5 },
          { value: "5", label: "5 to 8 kW", test: (i) => i.kw >= 4.5 && i.kw <= 8 },
          { value: "10", label: "10 kW and up", test: (i) => i.kw > 8 },
        ],
      },
      { key: "phase", label: "Phase", options: [{ value: "1", label: "Single-phase", test: (i) => i.phase === 1 }, { value: "3", label: "Three-phase", test: (i) => i.phase === 3 }] },
    ],
    sorts: [
      { key: "price", label: "Price, low to high", compare: (a, b) => mid(a) - mid(b) },
      { key: "perkw", label: "Price per kW", compare: (a, b) => mid(a) / a.kw - mid(b) / b.kw },
      { key: "kw", label: "Output", compare: (a, b) => a.kw - b.kw || mid(a) - mid(b) },
      { key: "warranty", label: "Warranty", compare: (a, b) => b.warrantyYears - a.warrantyYears || mid(a) - mid(b) },
      { key: "efficiency", label: "Efficiency", compare: (a, b) => b.efficiency - a.efficiency || mid(a) - mid(b) },
    ],
    actions: (i) => [{ href: `/tools/solar/solar-payback-calculator?kw=${i.kw}`, label: `Payback on a ${i.kw} kW system` }],
  };
  return <Comparator items={inverters} config={config} />;
}
