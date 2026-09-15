"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One comparison engine for every compare page. A page passes items plus a config: how to filter, sort,
 * search and describe them, which specs matter and which direction is "better". The engine renders the
 * filter bar, cards on phones and a table on wider screens, a sticky tray of the items being compared, and
 * the side-by-side with the best value in each row marked. Filters and picks live in the URL so a comparison
 * can be shared.
 */
export type Spec<T> = {
  key: string;
  label: string;
  get: (item: T) => string;
  /** Numeric value used to decide the best in a row and to sort; omit for text specs. */
  num?: (item: T) => number | null;
  /** Which direction wins in the side-by-side. */
  best?: "min" | "max";
  /** Show on the card (up to four are shown). */
  card?: boolean;
  /** Show as a table column. */
  column?: boolean;
  align?: "right";
};
export type FilterGroup<T> = { key: string; label: string; options: { value: string; label: string; test: (item: T) => boolean }[] };
export type SortOption<T> = { key: string; label: string; compare: (a: T, b: T) => number };
export type CompareConfig<T> = {
  id: (item: T) => string;
  title: (item: T) => string;
  subtitle?: (item: T) => string;
  /** The headline figure on the card and in the table (usually the price). */
  price: (item: T) => string;
  priceNum: (item: T) => number;
  searchText: (item: T) => string;
  specs: Spec<T>[];
  filters: FilterGroup<T>[];
  sorts: SortOption<T>[];
  /** Links under each item in the side-by-side (calculators with the item's numbers filled in). */
  actions?: (item: T) => { href: string; label: string }[];
  noun: string;
  max?: number;
};

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn("whitespace-nowrap border px-2.5 py-1 text-[13px]", active ? "border-[var(--text)] bg-ink-900 text-white" : "border-line text-2 hover:border-ink-500 hover:text-[var(--text)]")}>
      {children}
    </button>
  );
}

export function Comparator<T>({ items, config }: { items: T[]; config: CompareConfig<T> }) {
  const MAX = config.max ?? 3;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // State is the URL; every change replaces the query without scrolling or a server round-trip.
  const filters = Object.fromEntries(config.filters.map((f) => [f.key, params.get(f.key) ?? "all"]));
  const sort = params.get("sort") ?? config.sorts[0].key;
  const q = params.get("q") ?? "";
  const picked = (params.get("pick") ?? "").split(",").filter(Boolean);
  const view = params.get("view") === "table" ? "table" : params.get("view") === "cards" ? "cards" : "auto";
  const set = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === "all") next.delete(k);
        else next.set(k, v);
      }
      const s = next.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const rows = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter((it) => config.filters.every((f) => filters[f.key] === "all" || f.options.find((o) => o.value === filters[f.key])?.test(it) !== false) && (!needle || config.searchText(it).toLowerCase().includes(needle)));
    const cmp = config.sorts.find((s) => s.key === sort)?.compare ?? config.sorts[0].compare;
    return [...list].sort(cmp);
  }, [items, config, filters, q, sort]);

  const compared = picked.map((id) => items.find((it) => config.id(it) === id)).filter((it): it is T => !!it);
  const toggle = (id: string) => set({ pick: (picked.includes(id) ? picked.filter((x) => x !== id) : picked.length >= MAX ? picked : [...picked, id]).join(",") });
  const cardSpecs = config.specs.filter((s) => s.card).slice(0, 4);
  const columns = config.specs.filter((s) => s.column);
  const activeCount = config.filters.filter((f) => filters[f.key] !== "all").length + (q ? 1 : 0);
  const sideRef = React.useRef<HTMLElement>(null);

  return (
    <div>
      {/* Filter bar */}
      <div className="space-y-2.5 border-y border-line py-3">
        {config.filters.map((f) => (
          <div key={f.key} className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 w-14 text-[11px] font-semibold uppercase tracking-[0.1em] text-3">{f.label}</span>
            <Chip active={filters[f.key] === "all"} onClick={() => set({ [f.key]: null })}>
              All
            </Chip>
            {f.options.map((o) => (
              <Chip key={o.value} active={filters[f.key] === o.value} onClick={() => set({ [f.key]: o.value })}>
                {o.label}
              </Chip>
            ))}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <input value={q} onChange={(e) => set({ q: e.target.value })} placeholder={`Find a ${config.noun}`} aria-label={`Find a ${config.noun}`} className="h-9 w-56 border border-line bg-surface px-3 text-sm outline-none placeholder:text-[var(--text-3)] focus:border-ink-500" />
          <label className="flex items-center gap-2 text-[13px]">
            <span className="text-3">Sort</span>
            <select value={sort} onChange={(e) => set({ sort: e.target.value })} className="h-9 border border-line bg-surface px-2 text-sm">
              {config.sorts.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <span className="text-[13px] text-3">
            {rows.length} of {items.length}
            {activeCount ? (
              <>
                {" · "}
                <button type="button" onClick={() => set(Object.fromEntries([...config.filters.map((f) => [f.key, null]), ["q", null]]))} className="underline underline-offset-4 hover:text-[var(--text)]">
                  clear filters
                </button>
              </>
            ) : null}
          </span>
          <span className="ml-auto hidden items-center gap-1 text-[12px] md:flex" role="group" aria-label="View">
            <Chip active={view !== "table"} onClick={() => set({ view: null })}>
              Cards
            </Chip>
            <Chip active={view === "table"} onClick={() => set({ view: "table" })}>
              Table
            </Chip>
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-2">Nothing matches these filters.</p>
      ) : view === "table" ? (
        <div className="hidden overflow-x-auto md:block">
          <table className="mt-2 w-full min-w-[720px] text-[14.5px]">
            <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-3">
              <tr className="border-b border-[var(--rule)]">
                <th className="py-2 pr-2 font-semibold">
                  <span className="sr-only">Compare</span>
                </th>
                <th className="py-2 pr-3 font-semibold">{config.noun}</th>
                {columns.map((c) => (
                  <th key={c.key} className={cn("py-2 pr-3 font-semibold", c.align === "right" && "text-right")}>
                    {c.label}
                  </th>
                ))}
                <th className="py-2 text-right font-semibold">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((it) => {
                const id = config.id(it);
                const on = picked.includes(id);
                return (
                  <tr key={id} id={id} className={cn(on && "bg-surface-2")}>
                    <td className="py-2 pr-2 align-top">
                      <input type="checkbox" checked={on} disabled={!on && picked.length >= MAX} onChange={() => toggle(id)} aria-label={`Compare ${config.title(it)}`} className="mt-1 size-4 accent-[var(--text)]" />
                    </td>
                    <td className="py-2 pr-3">
                      <span className="font-medium">{config.title(it)}</span>
                      {config.subtitle ? <span className="block text-[12.5px] text-3">{config.subtitle(it)}</span> : null}
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className={cn("py-2 pr-3 text-2", c.align === "right" && "text-right tabular")}>
                        {c.get(it)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap py-2 text-right tabular font-medium">{config.price(it)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {rows.length && view !== "table" ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((it) => {
            const id = config.id(it);
            const on = picked.includes(id);
            const full = !on && picked.length >= MAX;
            return (
              <li key={id} id={id} className={cn("flex flex-col border p-4", on ? "border-[var(--text)]" : "border-line")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-serif text-[1.15rem] font-medium leading-snug">{config.title(it)}</p>
                    {config.subtitle ? <p className="mt-0.5 text-[12.5px] text-3">{config.subtitle(it)}</p> : null}
                  </div>
                  <button type="button" onClick={() => toggle(id)} disabled={full} aria-pressed={on} className={cn("shrink-0 border px-2 py-1 text-[12px] font-medium", on ? "border-[var(--text)] bg-ink-900 text-white" : "border-line text-2 hover:border-ink-500 hover:text-[var(--text)] disabled:opacity-40")}>
                    {on ? "Picked" : full ? `Max ${MAX}` : "Compare"}
                  </button>
                </div>
                <p className="mt-3 text-[1.35rem] font-semibold tabular tracking-tight">{config.price(it)}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13.5px]">
                  {cardSpecs.map((s) => (
                    <div key={s.key} className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-[0.08em] text-3">{s.label}</dt>
                      <dd className="truncate" title={s.get(it)}>
                        {s.get(it)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>
      ) : null}
      {rows.length && view === "table" ? (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 md:hidden">
          {rows.map((it) => (
            <li key={config.id(it)} className="border border-line p-4">
              <p className="font-medium">{config.title(it)}</p>
              <p className="mt-1 tabular">{config.price(it)}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-[12.5px] text-3">Pick up to {MAX} to compare side by side. The link in your address bar carries your filters and picks.</p>

      {/* Side by side */}
      {compared.length ? (
        <section ref={sideRef} id="compare" className="mt-10 border-t-2 border-[var(--rule)] pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-serif text-2xl">Side by side</h3>
            <p className="text-[13px] text-3">
              {compared.length < MAX ? `Pick ${MAX - compared.length} more, or ` : ""}
              <button type="button" onClick={() => set({ pick: null })} className="underline underline-offset-4 hover:text-[var(--text)]">
                clear
              </button>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[520px] text-[15px]">
              <thead>
                <tr className="border-b border-[var(--rule)] text-left align-bottom">
                  <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-3">Spec</th>
                  {compared.map((it) => (
                    <th key={config.id(it)} className="py-2 pr-3 align-bottom">
                      <span className="block font-serif text-[1.05rem] font-medium leading-snug">{config.title(it)}</span>
                      <button type="button" onClick={() => toggle(config.id(it))} className="mt-1 text-[12px] font-normal text-3 underline-offset-4 hover:underline">
                        remove
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <tr>
                  <td className="py-2 pr-3 text-2">Price</td>
                  {compared.map((it) => {
                    const best = compared.length > 1 && config.priceNum(it) === Math.min(...compared.map(config.priceNum));
                    return (
                      <td key={config.id(it)} className={cn("py-2 pr-3 tabular", best && "font-semibold")}>
                        {config.price(it)}
                        {best ? <span className="ml-1 text-[11px] uppercase tracking-[0.08em] text-3">lowest</span> : null}
                      </td>
                    );
                  })}
                </tr>
                {config.specs.map((s) => {
                  const nums = s.num ? compared.map((it) => s.num!(it)) : [];
                  const valid = nums.filter((n): n is number => n !== null && Number.isFinite(n));
                  const target = s.best && valid.length > 1 ? (s.best === "min" ? Math.min(...valid) : Math.max(...valid)) : null;
                  const allSame = valid.length > 1 && valid.every((n) => n === valid[0]);
                  return (
                    <tr key={s.key}>
                      <td className="py-2 pr-3 text-2">{s.label}</td>
                      {compared.map((it, k) => {
                        const win = target !== null && !allSame && nums[k] === target;
                        return (
                          <td key={config.id(it)} className={cn("py-2 pr-3 tabular", win && "font-semibold")}>
                            {s.get(it)}
                            {win ? <span className="ml-1 text-[11px] uppercase tracking-[0.08em] text-3">best</span> : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {config.actions ? (
                  <tr>
                    <td className="py-2 pr-3 text-2">Work it out</td>
                    {compared.map((it) => (
                      <td key={config.id(it)} className="py-2 pr-3 text-[13.5px]">
                        {config.actions!(it).map((a) => (
                          <Link key={a.href} href={a.href} className="block underline underline-offset-4">
                            {a.label}
                          </Link>
                        ))}
                      </td>
                    ))}
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* Sticky tray */}
      {picked.length ? (
        <div className="sticky bottom-0 z-20 mt-6 border-t border-[var(--text)] bg-[var(--bg)]/95 py-2.5 backdrop-blur-[2px]">
          <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
            <span className="mr-1 font-medium">Comparing {compared.length}</span>
            {compared.map((it) => (
              <button key={config.id(it)} type="button" onClick={() => toggle(config.id(it))} className="border border-line px-2 py-0.5 text-2 hover:border-ink-500 hover:text-[var(--text)]" aria-label={`Remove ${config.title(it)}`}>
                {config.title(it)} <span aria-hidden>×</span>
              </button>
            ))}
            <button type="button" onClick={() => sideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="ml-auto bg-ink-900 px-3 py-1.5 text-[13px] font-semibold text-white">
              See side by side
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
