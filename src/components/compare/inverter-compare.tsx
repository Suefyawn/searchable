"use client";

import { useMemo, useState } from "react";
import { INVERTER_TYPES, type Inverter, type InverterType } from "@/content/inverters";
import { pkr } from "@/lib/format";
import { cn } from "@/lib/utils";

type TypeFilter = InverterType | "all";
type KwFilter = "all" | "3" | "5" | "10";
type Sort = "price" | "kw" | "warranty" | "efficiency";

const KW_BANDS: Record<KwFilter, { label: string; test: (kw: number) => boolean }> = {
  all: { label: "All sizes", test: () => true },
  "3": { label: "3–4 kW", test: (kw) => kw < 4.5 },
  "5": { label: "5–8 kW", test: (kw) => kw >= 4.5 && kw <= 8 },
  "10": { label: "10 kW+", test: (kw) => kw > 8 },
};

const MAX_COMPARE = 3;

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("px-2.5 py-1.5 text-sm transition-colors", active ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2 hover:text-[var(--text)]")}>
      {children}
    </button>
  );
}

const mid = (i: Inverter) => (i.price[0] + i.price[1]) / 2;

export function InverterCompare({ inverters }: { inverters: Inverter[] }) {
  const [type, setType] = useState<TypeFilter>("all");
  const [kw, setKw] = useState<KwFilter>("all");
  const [sort, setSort] = useState<Sort>("price");
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo(() => {
    const list = inverters.filter((i) => (type === "all" || i.type === type) && KW_BANDS[kw].test(i.kw));
    const by: Record<Sort, (a: Inverter, b: Inverter) => number> = {
      price: (a, b) => mid(a) - mid(b),
      kw: (a, b) => a.kw - b.kw || mid(a) - mid(b),
      warranty: (a, b) => b.warrantyYears - a.warrantyYears || mid(a) - mid(b),
      efficiency: (a, b) => b.efficiency - a.efficiency || mid(a) - mid(b),
    };
    return [...list].sort(by[sort]);
  }, [inverters, type, kw, sort]);

  const compared = picked.map((id) => inverters.find((i) => i.id === id)).filter((i): i is Inverter => !!i);

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_COMPARE ? p : [...p, id]));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-3 text-sm">
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs uppercase tracking-wider text-3">Type</span>
          <FilterButton active={type === "all"} onClick={() => setType("all")}>All</FilterButton>
          {(Object.keys(INVERTER_TYPES) as InverterType[]).map((t) => (
            <FilterButton key={t} active={type === t} onClick={() => setType(t)}>
              {INVERTER_TYPES[t].name}
            </FilterButton>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs uppercase tracking-wider text-3">Size</span>
          {(Object.keys(KW_BANDS) as KwFilter[]).map((k) => (
            <FilterButton key={k} active={kw === k} onClick={() => setKw(k)}>
              {KW_BANDS[k].label}
            </FilterButton>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-3">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-8 border border-line bg-surface px-2 text-sm">
            <option value="price">Price, low to high</option>
            <option value="kw">Size</option>
            <option value="warranty">Longest warranty</option>
            <option value="efficiency">Efficiency</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="mt-2 w-full min-w-[720px] text-[15px]">
          <thead className="text-left text-xs uppercase tracking-wider text-3">
            <tr className="border-b border-[var(--rule)]">
              <th className="py-2 pr-2 font-medium">
                <span className="sr-only">Compare</span>
              </th>
              <th className="py-2 pr-3 font-medium">Inverter</th>
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 text-right font-medium">kW</th>
              <th className="py-2 pr-3 text-right font-medium">Phase</th>
              <th className="py-2 pr-3 text-right font-medium">Battery</th>
              <th className="py-2 pr-3 text-right font-medium">Warranty</th>
              <th className="py-2 text-right font-medium">Price (Rs)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((i) => {
              const checked = picked.includes(i.id);
              const disabled = !checked && picked.length >= MAX_COMPARE;
              return (
                <tr key={i.id} className={cn(checked && "bg-surface-2")}>
                  <td className="py-2 pr-2 align-top">
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(i.id)} aria-label={`Compare ${i.brand} ${i.model}`} className="mt-1 h-4 w-4 accent-[var(--text)]" />
                  </td>
                  <td className="py-2 pr-3">
                    <span className="font-medium">{i.brand}</span> {i.model}
                    {i.note ? <span className="block text-xs text-3">{i.note}</span> : null}
                  </td>
                  <td className="py-2 pr-3 text-2">{INVERTER_TYPES[i.type].name}</td>
                  <td className="py-2 pr-3 text-right tabular">{i.kw}</td>
                  <td className="py-2 pr-3 text-right tabular">{i.phase === 3 ? "3-ph" : "1-ph"}</td>
                  <td className="py-2 pr-3 text-right tabular">{i.batteryV ? `${i.batteryV} V` : "—"}</td>
                  <td className="py-2 pr-3 text-right tabular">{i.warrantyYears} yr</td>
                  <td className="py-2 text-right tabular whitespace-nowrap">
                    {pkr(i.price[0])} – {pkr(i.price[1])}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-2">
                  No inverters match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-3">Tick up to {MAX_COMPARE} to compare side by side. Prices are dealer ranges for the bare unit; installation, structure and net-metering kit are extra.</p>

      {compared.length > 0 ? (
        <section id="compare" className="mt-8 border-t-2 border-[var(--rule)] pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-serif text-2xl">Side by side</h3>
            <button type="button" onClick={() => setPicked([])} className="text-sm underline underline-offset-4">
              Clear
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[560px] text-[15px]">
              <thead>
                <tr className="border-b border-[var(--rule)] text-left align-bottom">
                  <th className="py-2 pr-3 text-xs font-medium uppercase tracking-wider text-3">Spec</th>
                  {compared.map((i) => (
                    <th key={i.id} className="py-2 pr-3 font-medium">
                      {i.brand} <span className="block text-sm font-normal text-2">{i.model}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(
                  [
                    ["Price (dealer range)", (i: Inverter) => `${pkr(i.price[0])} – ${pkr(i.price[1])}`],
                    ["Price per kW (mid)", (i: Inverter) => pkr(Math.round(mid(i) / i.kw))],
                    ["Type", (i: Inverter) => INVERTER_TYPES[i.type].name],
                    ["Rated output", (i: Inverter) => `${i.kw} kW, ${i.phase === 3 ? "three-phase" : "single-phase"}`],
                    ["Max PV input", (i: Inverter) => `${i.maxPvKw} kW`],
                    ["MPPT trackers", (i: Inverter) => String(i.mppt)],
                    ["Battery", (i: Inverter) => (i.batteryV ? `${i.batteryV} V` : "No battery (on-grid)")],
                    ["Peak efficiency", (i: Inverter) => `${i.efficiency}%`],
                    ["Net metering", (i: Inverter) => (i.netMetering ? "Yes" : "No")],
                    ["Wi-Fi monitoring", (i: Inverter) => (i.wifi ? "Yes" : "No")],
                    ["Warranty", (i: Inverter) => `${i.warrantyYears} years`],
                    ["Origin", (i: Inverter) => i.origin],
                  ] as [string, (i: Inverter) => string][]
                ).map(([label, fn]) => (
                  <tr key={label}>
                    <td className="py-2 pr-3 text-2">{label}</td>
                    {compared.map((i) => (
                      <td key={i.id} className="py-2 pr-3 tabular">
                        {fn(i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
