"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BODY_LABELS, FUEL_LABELS, type Body, type Car, type Fuel } from "@/content/cars";
import { pkr } from "@/lib/format";
import { cn } from "@/lib/utils";

type Budget = "all" | "40" | "60" | "100" | "100+";
type Sort = "price" | "priceDesc" | "economy" | "brand";
const BUDGETS: Record<Budget, { label: string; test: (lo: number) => boolean }> = {
  all: { label: "Any budget", test: () => true },
  "40": { label: "Under Rs 40 lakh", test: (lo) => lo < 40e5 },
  "60": { label: "40–60 lakh", test: (lo) => lo >= 40e5 && lo < 60e5 },
  "100": { label: "60 lakh – 1 crore", test: (lo) => lo >= 60e5 && lo < 100e5 },
  "100+": { label: "Over 1 crore", test: (lo) => lo >= 100e5 },
};
const MAX = 3;
const lakh = (n: number) => (n >= 1e7 ? `${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} crore` : `${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} lakh`);
const priceRange = (c: Car) => (c.price[0] === c.price[1] ? `Rs ${lakh(c.price[0])}` : `Rs ${lakh(c.price[0])} – ${lakh(c.price[1])}`);

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("whitespace-nowrap px-2.5 py-1.5 text-sm", active ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2 hover:text-[var(--text)]")}>
      {children}
    </button>
  );
}

export function CarCompare({ cars }: { cars: Car[] }) {
  const [body, setBody] = useState<Body | "all">("all");
  const [fuel, setFuel] = useState<Fuel | "all">("all");
  const [budget, setBudget] = useState<Budget>("all");
  const [sort, setSort] = useState<Sort>("price");
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo(() => {
    const list = cars.filter((c) => (body === "all" || c.body === body) && (fuel === "all" || c.fuel === fuel) && BUDGETS[budget].test(c.price[0]));
    const kmpl = (c: Car) => (c.fuel === "electric" ? 99 : parseFloat(c.economy) || 0);
    const by: Record<Sort, (a: Car, b: Car) => number> = {
      price: (a, b) => a.price[0] - b.price[0],
      priceDesc: (a, b) => b.price[0] - a.price[0],
      economy: (a, b) => kmpl(b) - kmpl(a),
      brand: (a, b) => a.brand.localeCompare(b.brand) || a.price[0] - b.price[0],
    };
    return [...list].sort(by[sort]);
  }, [cars, body, fuel, budget, sort]);

  const compared = picked.map((id) => cars.find((c) => c.id === id)).filter((c): c is Car => !!c);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? p : [...p, id]));
  const bodies = [...new Set(cars.map((c) => c.body))] as Body[];
  const fuels = [...new Set(cars.map((c) => c.fuel))] as Fuel[];

  return (
    <div>
      <div className="space-y-2 border-y border-line py-3 text-sm">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs uppercase tracking-wider text-3">Body</span>
          <Chip active={body === "all"} onClick={() => setBody("all")}>All</Chip>
          {bodies.map((b) => (
            <Chip key={b} active={body === b} onClick={() => setBody(b)}>{BODY_LABELS[b]}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs uppercase tracking-wider text-3">Fuel</span>
          <Chip active={fuel === "all"} onClick={() => setFuel("all")}>All</Chip>
          {fuels.map((f) => (
            <Chip key={f} active={fuel === f} onClick={() => setFuel(f)}>{FUEL_LABELS[f]}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs uppercase tracking-wider text-3">Budget</span>
            {(Object.keys(BUDGETS) as Budget[]).map((k) => (
              <Chip key={k} active={budget === k} onClick={() => setBudget(k)}>{BUDGETS[k].label}</Chip>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-3">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-8 border border-line bg-surface px-2 text-sm">
              <option value="price">Price, low to high</option>
              <option value="priceDesc">Price, high to low</option>
              <option value="economy">Fuel economy</option>
              <option value="brand">Brand</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="mt-2 w-full min-w-[760px] text-[15px]">
          <thead className="text-left text-xs uppercase tracking-wider text-3">
            <tr className="border-b border-[var(--rule)]">
              <th className="py-2 pr-2 font-medium"><span className="sr-only">Compare</span></th>
              <th className="py-2 pr-3 font-medium">Car</th>
              <th className="py-2 pr-3 font-medium">Body</th>
              <th className="py-2 pr-3 font-medium">Engine</th>
              <th className="py-2 pr-3 font-medium">Gearbox</th>
              <th className="py-2 pr-3 text-right font-medium">Economy</th>
              <th className="py-2 text-right font-medium">Price (ex-factory)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((c) => {
              const checked = picked.includes(c.id);
              return (
                <tr key={c.id} id={c.id} className={cn(checked && "bg-surface-2")}>
                  <td className="py-2 pr-2 align-top"><input type="checkbox" checked={checked} disabled={!checked && picked.length >= MAX} onChange={() => toggle(c.id)} aria-label={`Compare ${c.brand} ${c.model}`} className="mt-1 h-4 w-4 accent-[var(--text)]" /></td>
                  <td className="py-2 pr-3">
                    <span className="font-medium">{c.brand} {c.model}</span>
                    <span className="block text-xs text-3">{c.variants} variant{c.variants > 1 ? "s" : ""} · {c.origin === "Imported (CBU)" ? "imported" : "local assembly"}{c.note ? ` · ${c.note}` : ""}</span>
                  </td>
                  <td className="py-2 pr-3 text-2">{BODY_LABELS[c.body]}</td>
                  <td className="py-2 pr-3 text-2">{c.engineLabel}{c.fuel !== "petrol" ? ` · ${FUEL_LABELS[c.fuel]}` : ""}</td>
                  <td className="py-2 pr-3 text-2">{c.transmission}</td>
                  <td className="py-2 pr-3 text-right tabular">{c.economy}</td>
                  <td className="py-2 text-right tabular whitespace-nowrap">{priceRange(c)}</td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="py-6 text-center text-2">No cars match these filters.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-3">Tick up to {MAX} to compare. Prices are published ex-factory rates; add registration, token tax and 231B withholding (filer/non-filer) for on-road cost.</p>

      {compared.length ? (
        <section id="compare" className="mt-8 border-t-2 border-[var(--rule)] pt-4">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-serif text-2xl">Side by side</h3>
            <button type="button" onClick={() => setPicked([])} className="text-sm underline underline-offset-4">Clear</button>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[560px] text-[15px]">
              <thead>
                <tr className="border-b border-[var(--rule)] text-left align-bottom">
                  <th className="py-2 pr-3 text-xs font-medium uppercase tracking-wider text-3">Spec</th>
                  {compared.map((c) => (
                    <th key={c.id} className="py-2 pr-3 font-medium">{c.brand} <span className="block text-sm font-normal text-2">{c.model}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {(
                  [
                    ["Price (ex-factory)", (c: Car) => priceRange(c)],
                    ["Body", (c: Car) => BODY_LABELS[c.body]],
                    ["Engine", (c: Car) => c.engineLabel],
                    ["Fuel", (c: Car) => FUEL_LABELS[c.fuel]],
                    ["Gearbox", (c: Car) => c.transmission],
                    ["Seats", (c: Car) => String(c.seats)],
                    ["Economy", (c: Car) => c.economy],
                    ["Airbags", (c: Car) => c.airbags],
                    ["Assembly", (c: Car) => c.origin],
                    ["Variants", (c: Car) => String(c.variants)],
                  ] as [string, (c: Car) => string][]
                ).map(([label, fn]) => (
                  <tr key={label}>
                    <td className="py-2 pr-3 text-2">{label}</td>
                    {compared.map((c) => <td key={c.id} className="py-2 pr-3 tabular">{fn(c)}</td>)}
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-3 text-2">Finance it</td>
                  {compared.map((c) => (
                    <td key={c.id} className="py-2 pr-3 text-sm">
                      <Link href={`/tools/cars/car-loan-calculator?price=${c.price[0]}`} className="underline underline-offset-4">Instalment on {pkr(c.price[0])}</Link>
                      <br />
                      <Link href={`/tools/cars/token-tax-calculator?cc=${c.fuel === "electric" ? 1000 : c.engine}&invoice=${c.price[0]}`} className="underline underline-offset-4">Token tax</Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
