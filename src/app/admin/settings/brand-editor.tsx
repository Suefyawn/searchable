"use client";

import * as React from "react";
import { ActionForm } from "@/components/admin/action-form";
import { Input } from "@/components/ui";
import type { BrandT } from "@/lib/site-settings";
import { resetBrand, saveBrand } from "./actions";

const ROLES: { key: keyof BrandT; name: string; role: string }[] = [
  { key: "ink", name: "Ink", role: "Headlines, body type, strong rules, the breaking bar" },
  { key: "slate", name: "Slate", role: "Secondary text; every grey is a tint of it" },
  { key: "accent", name: "Accent", role: "Carousel timer, live dot, chart line, highlights" },
  { key: "link", name: "Link", role: "Links, eyebrow labels, chips" },
  { key: "primary", name: "Primary", role: "Buttons and the darkest brand tone" },
];

/**
 * Five colours with a preview that re-renders as you type, using the same tokens the site does: what you
 * see in the sample is what every page becomes on save.
 */
export function BrandEditor({ brand }: { brand: BrandT }) {
  const [draft, setDraft] = React.useState<BrandT>(brand);
  const set = (k: keyof BrandT, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const vars = { "--brand-ink": draft.ink, "--brand-slate": draft.slate, "--brand-accent": draft.accent, "--brand-link": draft.link, "--brand-primary": draft.primary } as React.CSSProperties;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ActionForm action={saveBrand} submit="Save brand" pendingLabel="Saving">
        <ul className="divide-y divide-[var(--border)] border-y border-line">
          {ROLES.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center gap-3 py-2.5">
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(draft[r.key]) ? draft[r.key] : "#000000"} onChange={(e) => set(r.key, e.target.value)} aria-label={`${r.name} colour`} className="h-9 w-12 cursor-pointer border border-line bg-transparent p-0.5" />
              <Input name={r.key} value={draft[r.key]} onChange={(e) => set(r.key, e.target.value)} maxLength={7} pattern="#[0-9a-fA-F]{6}" className="w-28 font-mono text-[13px] uppercase" aria-label={`${r.name} hex`} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium">{r.name}</span>
                <span className="block text-[12.5px] text-3">{r.role}</span>
              </span>
            </li>
          ))}
        </ul>
      </ActionForm>
      <div>
        <p className="eyebrow mb-2">Preview</p>
        <div style={vars} className="brand-scope border border-line p-5">
          <p className="eyebrow">Economy</p>
          <h3 className="mt-1 font-display text-2xl leading-tight">Petrol up Rs 2.61 from tonight: a 40-litre tank now costs Rs 15,210</h3>
          <p className="mt-2 text-[15px] text-2">The fortnightly OGRA review lifts petrol and diesel; here is what a full tank, a month of commuting and a rickshaw fare look like now.</p>
          <p className="mt-2 text-[15px]">
            Read the <a className="text-brand-700 underline underline-offset-4">petrol price history</a> or try the <a className="text-brand-700 underline underline-offset-4">fuel cost calculator</a>.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex h-9 items-center bg-brand-800 px-4 text-sm font-medium text-white">Primary button</span>
            <span className="inline-flex h-9 items-center border border-line px-4 text-sm font-medium">Outline</span>
            <span className="inline-flex h-9 items-center bg-ink-900 px-3 text-sm text-white">Chip</span>
            <span className="live-dot" /> <span className="text-[12px] text-3">live</span>
          </div>
          <div className="mt-4 h-[2px] w-full bg-[var(--border)]">
            <div className="h-full w-2/3 bg-brand-500" />
          </div>
          <div className="mt-4 grid grid-cols-5 gap-1">
            {(["ink", "slate", "accent", "link", "primary"] as const).map((k) => (
              <div key={k} className="h-10" style={{ background: draft[k] }} title={k} />
            ))}
          </div>
          <div className="mt-1 grid grid-cols-10 gap-1">
            {["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"].map((n) => (
              <div key={n} className="h-5" style={{ background: `var(--color-brand-${n})` }} title={`brand-${n}`} />
            ))}
          </div>
          <div className="mt-1 grid grid-cols-10 gap-1">
            {["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"].map((n) => (
              <div key={n} className="h-5" style={{ background: `var(--color-ink-${n})` }} title={`ink-${n}`} />
            ))}
          </div>
        </div>
        <div className="mt-3">
          <ActionForm action={resetBrand} submit="Reset to charcoal and blue" size="sm" variant="ghost" inline />
        </div>
      </div>
    </div>
  );
}
