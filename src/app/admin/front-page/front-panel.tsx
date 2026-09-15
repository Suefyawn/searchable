"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button, Input, Select } from "@/components/ui";
import type { FrontPageT } from "@/lib/front-page";
import { cn } from "@/lib/utils";
import { setBreaking, setFeatured, setLead, setPins } from "./actions";

export type Story = { id: string; title: string; category: string; publishedAt: string | null; ago: string; image: string | null; isFeatured: boolean; url: string };

const LEAD_HOURS = [6, 12, 24, 48, 72];

/* Plain <img>: admin thumbnails of our own renditions, no optimiser (docs/FREE-TIER.md). */
function Thumb({ src, className }: { src: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} />;
}
const BREAK_HOURS = [1, 2, 3, 6, 12, 24];

/**
 * The front-page desk: the breaking bar, the lead, the pins and the resulting hero, all in one panel with
 * the outcome shown as it will appear. Every change saves at once and refreshes the numbers.
 */
export function FrontPanel({ front, stories, hero, leadSource, now }: { front: FrontPageT; stories: Story[]; hero: Story[]; leadSource: string; now: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [leadHours, setLeadHours] = React.useState(24);
  const [breakText, setBreakText] = React.useState(front.breaking?.text ?? "");
  const [breakHref, setBreakHref] = React.useState(front.breaking?.href ?? "");
  const [breakHours, setBreakHours] = React.useState(6);
  const byId = new Map(stories.map((s) => [s.id, s]));

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(key);
    setError(null);
    const r = await fn();
    if (!r.ok) setError(r.error ?? "Something went wrong");
    setBusy(null);
    router.refresh();
  }
  const pins = front.pins.filter((id) => byId.has(id));
  const move = (id: string, dir: -1 | 1) => {
    const i = pins.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= pins.length) return;
    const next = [...pins];
    [next[i], next[j]] = [next[j], next[i]];
    void run(`pin-${id}`, () => setPins(next));
  };
  const leadLive = front.leadId && (!front.leadUntil || new Date(front.leadUntil).getTime() > now);
  const hoursLeft = (until?: string | null) => (until ? Math.max(0, Math.round((new Date(until).getTime() - now) / 3_600_000)) : null);

  return (
    <div className="space-y-10">
      {error ? <p className="border-l-2 border-[var(--text)] pl-3 text-[14px]">{error}</p> : null}

      <section>
        <h2 className="eyebrow mb-2 border-b-2 border-[var(--rule)] pb-1.5">Breaking bar</h2>
        <p className="mb-3 text-[13.5px] text-2">A black line across the top of every page. Use it for the one thing everyone needs to know right now; it disappears on its own.</p>
        {front.breaking && (!front.breaking.until || new Date(front.breaking.until).getTime() > now) ? (
          <div className="mb-3 flex flex-wrap items-center gap-3 bg-ink-900 px-3 py-2 text-[13.5px] text-white">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Breaking</span>
            <span className="min-w-0 flex-1 truncate">{front.breaking.text}</span>
            <span className="text-[12px] opacity-70">{hoursLeft(front.breaking.until)} h left</span>
            <Button size="sm" variant="secondary" disabled={busy === "break-clear"} onClick={() => run("break-clear", () => setBreaking(null))}>
              Clear
            </Button>
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px_110px_auto]">
          <Input value={breakText} onChange={(e) => setBreakText(e.target.value)} placeholder="Petrol up Rs 5 from midnight, OGRA confirms" maxLength={160} aria-label="Breaking text" />
          <Input value={breakHref} onChange={(e) => setBreakHref(e.target.value)} placeholder="/news/economy/... (optional)" maxLength={300} aria-label="Link" />
          <Select value={String(breakHours)} onChange={(e) => setBreakHours(Number(e.target.value))} aria-label="Hours">
            {BREAK_HOURS.map((h) => (
              <option key={h} value={h}>
                {h} h
              </option>
            ))}
          </Select>
          <Button disabled={busy === "break" || breakText.trim().length < 3} onClick={() => run("break", () => setBreaking({ text: breakText, href: breakHref, hours: breakHours }))}>
            {front.breaking ? "Update" : "Show"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-2 border-b-2 border-[var(--rule)] pb-1.5">Hero, as it stands</h2>
        <p className="mb-3 text-[13.5px] text-2">
          Lead: <span className="text-[var(--text)]">{leadSource === "manual" ? `pinned by hand, ${hoursLeft(front.leadUntil)} h left` : leadSource === "featured" ? "the featured story (48 hours from publish)" : "the newest story"}</span>. Then the pins in order, then the newest stories with photos.
        </p>
        <ol className="grid gap-2 sm:grid-cols-5">
          {hero.map((s, i) => (
            <li key={s.id} className="border border-line">
              <div className="aspect-[16/9] bg-surface-2">{s.image ? <Thumb src={s.image} className="h-full w-full object-cover object-[50%_30%]" /> : null}</div>
              <div className="p-2">
                <p className="text-[11px] uppercase tracking-[0.1em] text-3">
                  {i + 1} · {i === 0 ? "lead" : pins.includes(s.id) ? "pinned" : "auto"}
                </p>
                <p className="mt-0.5 line-clamp-3 text-[13px] leading-snug">{s.title}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--rule)] pb-1.5">
          <h2 className="eyebrow">Recent stories</h2>
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-3">Lead for</span>
            <Select value={String(leadHours)} onChange={(e) => setLeadHours(Number(e.target.value))} aria-label="Lead hours" className="h-8 text-[13px]">
              {LEAD_HOURS.map((h) => (
                <option key={h} value={h}>
                  {h} h
                </option>
              ))}
            </Select>
            {leadLive ? (
              <Button size="sm" variant="outline" disabled={busy === "lead-clear"} onClick={() => run("lead-clear", () => setLead({ id: null }))}>
                Clear lead
              </Button>
            ) : null}
            {pins.length ? (
              <Button size="sm" variant="outline" disabled={busy === "pins-clear"} onClick={() => run("pins-clear", () => setPins([]))}>
                Clear pins
              </Button>
            ) : null}
          </div>
        </div>
        <ul className="divide-y divide-[var(--border)] border-y border-line">
          {stories.map((s) => {
            const isLead = leadLive && front.leadId === s.id;
            const pinIndex = pins.indexOf(s.id);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 text-[13.5px]">
                <span className={cn("h-10 w-16 shrink-0 bg-surface-2", !s.image && "opacity-50")}>{s.image ? <Thumb src={s.image} className="h-full w-full object-cover" /> : null}</span>
                <span className="min-w-0 flex-1">
                  <a href={s.url} target="_blank" rel="noreferrer" className="block truncate font-medium underline-offset-4 hover:underline">
                    {s.title}
                  </a>
                  <span className="text-[12.5px] text-3">
                    {s.category} · {s.ago}
                    {!s.image ? " · no photo, cannot be a slide" : ""}
                    {isLead ? " · lead" : ""}
                    {pinIndex >= 0 ? ` · pin ${pinIndex + 1}` : ""}
                    {s.isFeatured ? " · featured" : ""}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-1">
                  {pinIndex >= 0 ? (
                    <>
                      <Button size="sm" variant="ghost" aria-label="Move up" disabled={pinIndex === 0 || !!busy} onClick={() => move(s.id, -1)}>
                        ↑
                      </Button>
                      <Button size="sm" variant="ghost" aria-label="Move down" disabled={pinIndex === pins.length - 1 || !!busy} onClick={() => move(s.id, 1)}>
                        ↓
                      </Button>
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(`pin-${s.id}`, () => setPins(pins.filter((p) => p !== s.id)))}>
                        Unpin
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" disabled={!!busy || !s.image || pins.length >= 6} onClick={() => run(`pin-${s.id}`, () => setPins([...pins, s.id]))}>
                      Pin
                    </Button>
                  )}
                  <Button size="sm" variant={isLead ? "secondary" : "outline"} disabled={!!busy || !s.image} onClick={() => run(`lead-${s.id}`, () => (isLead ? setLead({ id: null }) : setLead({ id: s.id, hours: leadHours })))}>
                    {isLead ? "Unlead" : "Lead"}
                  </Button>
                  <Button size="sm" variant={s.isFeatured ? "secondary" : "ghost"} disabled={!!busy} onClick={() => run(`feat-${s.id}`, () => setFeatured(s.id, !s.isFeatured))}>
                    {s.isFeatured ? "Featured" : "Feature"}
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
