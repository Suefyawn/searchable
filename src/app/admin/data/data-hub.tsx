"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stat, Status } from "@/components/admin";
import { Button, Input, Select, Textarea } from "@/components/ui";
import type { IngestResult } from "@/lib/ingest";
import { formatDate, number } from "@/lib/format";
import { cn } from "@/lib/utils";
import { addBulkAction, addReadingAction, deleteReadingAction, ingestNowAction, updateSeriesAction } from "./actions";

export type Point = { id: string; date: string; value: number; note: string | null; sourceUrl: string | null };
export type SeriesRow = {
  id: string;
  slug: string;
  name: string;
  unit: string;
  frequency: string;
  description: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  auto: boolean;
  latest: { date: string; value: number } | null;
  previous: { date: string; value: number } | null;
  /** Oldest to newest, up to 30. */
  points: Point[];
  /** Days since the latest reading, or null. */
  ageDays: number | null;
  /** How many days a reading may be before it counts as stale, from the frequency. */
  staleAfter: number;
};
export type IngestRun = { at: string; results: IngestResult[]; errors: string[] } | null;

type Filter = "all" | "auto" | "manual" | "stale" | "held";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "auto", label: "Automatic" },
  { key: "manual", label: "By hand" },
  { key: "stale", label: "Stale" },
  { key: "held", label: "Held" },
];

const fmt = (v: number) => number(v, Number.isInteger(v) ? 0 : Math.abs(v) < 10 ? 2 : Math.abs(v) < 1000 ? 2 : 0);
const todayKarachi = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })).toISOString().slice(0, 10);

/** Freshness word for the pill: fresh within the frequency window, stale past it, never when empty. */
function freshness(s: SeriesRow): "fresh" | "stale" | "never" {
  if (s.ageDays === null) return "never";
  return s.ageDays > s.staleAfter ? "stale" : "fresh";
}

/** Thin line with a soft area, last point emphasised; scaled to the series' own range so small moves stay visible. */
function Sparkline({ points, width = 120, height = 32 }: { points: Point[]; width?: number; height?: number }) {
  if (points.length < 2) return <div className="h-8 w-[120px] border-b border-dashed border-line" aria-hidden />;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || Math.abs(max) * 0.02 || 1;
  const x = (i: number) => (i / (points.length - 1)) * (width - 4) + 2;
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 8);
  const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = vals[vals.length - 1];
  const up = vals.length > 1 && last >= vals[vals.length - 2];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" role="img" aria-label={`${points.length} readings`}>
      <path d={`${d} L${x(vals.length - 1).toFixed(1)},${height} L2,${height} Z`} className="fill-ink-100" />
      <path d={d} fill="none" className="stroke-ink-700" strokeWidth="1.25" />
      <circle cx={x(vals.length - 1)} cy={y(last)} r="2.5" className={up ? "fill-ink-900" : "fill-ink-500"} />
    </svg>
  );
}

function Change({ latest, previous }: { latest: number; previous: number | null }) {
  if (previous === null || previous === 0) return <span className="text-3">first reading</span>;
  const diff = latest - previous;
  const pct = (diff / Math.abs(previous)) * 100;
  if (Math.abs(diff) < 1e-9) return <span className="text-3">no change</span>;
  const big = Math.abs(pct) >= 30;
  return (
    <span className={cn("tabular", diff > 0 ? "text-red-700" : "text-emerald-700", big && "font-semibold")} title={big ? "More than 30% from the previous reading" : undefined}>
      {diff > 0 ? "▲" : "▼"} {fmt(Math.abs(diff))} ({pct > 0 ? "+" : ""}
      {pct.toFixed(Math.abs(pct) < 1 ? 2 : 1)}%)
    </span>
  );
}

/* ───────────── Inline panels ───────────── */

function AddPanel({ s, onDone }: { s: SeriesRow; onDone: (msg: string) => void }) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"one" | "bulk">("one");
  const [date, setDate] = React.useState(todayKarachi());
  const [value, setValue] = React.useState("");
  const [note, setNote] = React.useState("");
  const [sourceUrl, setSourceUrl] = React.useState(s.sourceUrl ?? "");
  const [confirm, setConfirm] = React.useState(false);
  const [bulk, setBulk] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const v = Number(value);
  const jump = s.latest && value !== "" && Number.isFinite(v) && s.latest.value !== 0 ? Math.abs(v - s.latest.value) / Math.abs(s.latest.value) : 0;
  const bigJump = jump > 0.3;
  const sameDate = s.points.some((p) => p.date === date);

  function submitOne() {
    if (!Number.isFinite(v)) return setError("Enter a number");
    if (bigJump && !confirm) return setError("That is more than 30% from the last reading. Tick the box if it is right.");
    setError(null);
    start(async () => {
      const r = await addReadingAction({ seriesId: s.id, date, value: v, note, sourceUrl });
      if (!r.ok) return setError(r.error);
      router.refresh();
      onDone(`${s.name}: ${fmt(v)} ${s.unit} recorded for ${formatDate(date)}${r.previous !== null ? ` (was ${fmt(r.previous)})` : ""}.`);
    });
  }
  function submitBulk() {
    if (!bulk.trim()) return setError("Paste at least one line");
    setError(null);
    start(async () => {
      const r = await addBulkAction(s.id, bulk, sourceUrl);
      if (!r.ok) return setError(r.error);
      router.refresh();
      onDone(`${s.name}: ${r.added} reading${r.added === 1 ? "" : "s"} written${r.problems.length ? `, ${r.problems.length} line${r.problems.length === 1 ? "" : "s"} skipped: ${r.problems.slice(0, 3).join("; ")}` : ""}.`);
    });
  }

  return (
    <div className="border-t border-line bg-surface-2 px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[13.5px]">
        <button type="button" onClick={() => setMode("one")} className={cn("border-b-2 pb-0.5", mode === "one" ? "border-[var(--text)] font-medium" : "border-transparent text-2")}>
          One reading
        </button>
        <button type="button" onClick={() => setMode("bulk")} className={cn("border-b-2 pb-0.5", mode === "bulk" ? "border-[var(--text)] font-medium" : "border-transparent text-2")}>
          Paste history
        </button>
        {s.latest ? (
          <span className="ml-auto text-3">
            Latest {fmt(s.latest.value)} {s.unit} on {formatDate(s.latest.date)}
          </span>
        ) : null}
      </div>
      {mode === "one" ? (
        <div className="grid gap-3 sm:grid-cols-[9.5rem_9rem_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="text-xs text-3">
            Date
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-9 text-sm" />
          </label>
          <label className="text-xs text-3">
            Value ({s.unit})
            <Input type="number" step="any" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 h-9 text-sm tabular" autoFocus />
          </label>
          <label className="text-xs text-3">
            Note
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="OGRA notification, SBP MPS" className="mt-1 h-9 text-sm" />
          </label>
          <label className="text-xs text-3">
            Source URL
            <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} maxLength={300} placeholder="https://" className="mt-1 h-9 text-sm" />
          </label>
          <Button size="sm" onClick={submitOne} disabled={pending}>
            {pending ? "Saving" : "Save reading"}
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
          <label className="text-xs text-3">
            One per line: date, value, optional note
            <Textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={5} placeholder={"2026-09-01, 267.50, OGRA notification\n2026-09-16, 272.61"} className="mt-1 font-mono text-[13px]" />
          </label>
          <div className="flex flex-col gap-3">
            <label className="text-xs text-3">
              Source URL for all lines
              <Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} maxLength={300} placeholder="https://" className="mt-1 h-9 text-sm" />
            </label>
            <Button size="sm" onClick={submitBulk} disabled={pending} className="self-start">
              {pending ? "Writing" : "Write readings"}
            </Button>
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px]">
        {mode === "one" && s.latest && value !== "" && Number.isFinite(v) ? (
          <span className={cn(bigJump ? "font-medium" : "text-2")}>
            Change: <Change latest={v} previous={s.latest.value} />
          </span>
        ) : null}
        {mode === "one" && bigJump ? (
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="accent-ink-900" /> Yes, this number is right
          </label>
        ) : null}
        {mode === "one" && sameDate ? <span className="text-2">A reading already exists for {formatDate(date)}; saving replaces it.</span> : null}
        {error ? <span className="border-l-2 border-[var(--text)] pl-2">{error}</span> : null}
      </div>
    </div>
  );
}

function HistoryPanel({ s, onDone }: { s: SeriesRow; onDone: (msg: string) => void }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [busy, setBusy] = React.useState<string | null>(null);
  const rows = [...s.points].reverse().slice(0, 12);
  if (!rows.length) return <p className="border-t border-line px-4 py-3 text-[14px] text-3">No readings yet.</p>;
  return (
    <div className="border-t border-line bg-surface-2 px-4 py-3">
      <table className="w-full text-[13.5px]">
        <thead className="text-left text-[11px] uppercase tracking-[0.08em] text-3">
          <tr>
            <th className="py-1 font-semibold">Date</th>
            <th className="py-1 text-right font-semibold">Value</th>
            <th className="py-1 pl-4 font-semibold">Note</th>
            <th className="py-1 pl-4 font-semibold">Source</th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="py-1.5 tabular">{formatDate(p.date)}</td>
              <td className="py-1.5 text-right tabular">
                {fmt(p.value)} <span className="text-3">{s.unit}</span>
              </td>
              <td className="max-w-[28ch] truncate py-1.5 pl-4 text-2" title={p.note ?? undefined}>
                {p.note ?? ""}
              </td>
              <td className="py-1.5 pl-4">
                {p.sourceUrl ? (
                  <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-2 underline underline-offset-4">
                    source
                  </a>
                ) : (
                  <span className="text-3">none</span>
                )}
              </td>
              <td className="py-1.5 text-right">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`Remove the ${formatDate(p.date)} reading (${fmt(p.value)} ${s.unit})?`)) return;
                    setBusy(p.id);
                    start(async () => {
                      const r = await deleteReadingAction(p.id);
                      setBusy(null);
                      if (!r.ok) return onDone(r.error);
                      router.refresh();
                      onDone(`${s.name}: ${formatDate(p.date)} reading removed.`);
                    });
                  }}
                  className="text-[12.5px] text-3 underline-offset-4 hover:text-[var(--text)] hover:underline disabled:opacity-50"
                >
                  {busy === p.id ? "Removing" : "Remove"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {s.points.length > rows.length ? (
        <p className="mt-2 text-[12.5px] text-3">
          Showing the last {rows.length}. The <Link href={`/data/${s.slug}`} className="underline underline-offset-4">public page</Link> has the full history and chart.
        </p>
      ) : null}
    </div>
  );
}

function EditPanel({ s, onDone }: { s: SeriesRow; onDone: (msg: string) => void }) {
  const router = useRouter();
  const [f, setF] = React.useState({ name: s.name, unit: s.unit, frequency: s.frequency, description: s.description ?? "", sourceName: s.sourceName ?? "", sourceUrl: s.sourceUrl ?? "" });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <div className="border-t border-line bg-surface-2 px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_7rem_9rem]">
        <label className="text-xs text-3">
          Name
          <Input value={f.name} onChange={set("name")} className="mt-1 h-9 text-sm" />
        </label>
        <label className="text-xs text-3">
          Unit
          <Input value={f.unit} onChange={set("unit")} className="mt-1 h-9 text-sm" />
        </label>
        <label className="text-xs text-3">
          Frequency
          <Select value={f.frequency} onChange={set("frequency")} className="mt-1 h-9 text-sm">
            {["daily", "weekly", "fortnightly", "monthly", "ad-hoc"].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-xs text-3 sm:col-span-3">
          Description (shown on the public page and read by AI crawlers)
          <Textarea value={f.description} onChange={set("description")} rows={2} maxLength={400} className="mt-1 text-sm" />
        </label>
        <label className="text-xs text-3">
          Source name
          <Input value={f.sourceName} onChange={set("sourceName")} className="mt-1 h-9 text-sm" />
        </label>
        <label className="text-xs text-3 sm:col-span-2">
          Source URL
          <Input value={f.sourceUrl} onChange={set("sourceUrl")} className="mt-1 h-9 text-sm" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await updateSeriesAction({ id: s.id, ...f, frequency: f.frequency as "daily" });
              if (!r.ok) return setError(r.error);
              router.refresh();
              onDone(`${f.name}: series details saved.`);
            });
          }}
        >
          {pending ? "Saving" : "Save series"}
        </Button>
        <span className="text-3">
          Slug <span className="font-mono">{s.slug}</span> is fixed: it is the public URL and the calculators&rsquo; key.
        </span>
        {error ? <span className="border-l-2 border-[var(--text)] pl-2">{error}</span> : null}
      </div>
    </div>
  );
}

/* ───────────── Ingestion ───────────── */

function IngestPanel({ last, held, onDone }: { last: IngestRun; held: IngestResult[]; onDone: (msg: string) => void }) {
  const router = useRouter();
  const [force, setForce] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [running, setRunning] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  function run(only?: string[]) {
    setRunning(only?.[0] ?? "all");
    start(async () => {
      const r = await ingestNowAction({ force: force || !!only, only });
      setRunning(null);
      if (!r.ok) return onDone(`Fetch failed: ${r.error}`);
      router.refresh();
      const written = r.results.filter((x) => x.status === "written").length;
      const rejected = r.results.filter((x) => x.status === "rejected").length;
      onDone(`Fetched ${r.results.length} series: ${written} written, ${rejected} held${r.errors.length ? `, ${r.errors.length} source error${r.errors.length === 1 ? "" : "s"}` : ""}.`);
    });
  }
  const results = last?.results ?? [];
  const counts = { written: results.filter((r) => r.status === "written").length, unchanged: results.filter((r) => r.status === "unchanged").length, rejected: results.filter((r) => r.status === "rejected").length, error: results.filter((r) => r.status === "error").length };
  return (
    <div className="border border-line">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <div className="min-w-0 flex-1 text-[14px]">
          <span className="font-medium">Automatic sources</span>
          <span className="text-2"> · SBP, open.er-api, PSO, spot gold and silver, PSX, CoinGecko</span>
          <p className="mt-0.5 text-[13px] text-3">
            {last ? (
              <>
                Last run {formatDate(last.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {counts.written} written · {counts.unchanged} unchanged
                {counts.rejected ? ` · ${counts.rejected} held` : ""}
                {counts.error || last.errors.length ? ` · ${counts.error + last.errors.length} error${counts.error + last.errors.length === 1 ? "" : "s"}` : ""}
              </>
            ) : (
              "Not run yet."
            )}
            {last ? (
              <button type="button" onClick={() => setOpen((o) => !o)} className="ml-2 underline underline-offset-4 hover:text-[var(--text)]">
                {open ? "Hide detail" : "Detail"}
              </button>
            ) : null}
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-[13px] text-2">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="accent-ink-900" /> accept large jumps
        </label>
        <Button size="sm" onClick={() => run()} disabled={pending}>
          {running === "all" ? "Fetching" : "Fetch now"}
        </Button>
      </div>
      {held.length ? (
        <ul className="divide-y divide-[var(--border)] border-t border-line">
          {held.map((r) => (
            <li key={r.slug} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[13.5px]">
              <Status value="pending" />
              <span className="font-mono text-[12.5px]">{r.slug}</span>
              <span>
                {r.value !== undefined ? fmt(r.value) : ""} <span className="text-3">was {r.previous !== undefined ? fmt(r.previous) : "?"}</span>
              </span>
              <span className="min-w-0 flex-1 truncate text-2">{r.message}</span>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run([r.slug])}>
                {running === r.slug ? "Accepting" : "Accept"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && last ? (
        <ul className="grid gap-x-6 gap-y-0.5 border-t border-line px-4 py-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <li key={r.slug} className={r.status === "rejected" || r.status === "error" ? "font-medium" : r.status === "unchanged" ? "text-3" : ""}>
              <span className="font-mono text-[12px]">{r.slug}</span> · {r.status}
              {r.value !== undefined ? ` · ${fmt(r.value)}` : ""}
              {r.previous !== undefined && r.status === "written" ? ` (was ${fmt(r.previous)})` : ""}
            </li>
          ))}
          {last.errors.map((e) => (
            <li key={e} className="font-medium sm:col-span-2 lg:col-span-3">
              {e}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ───────────── The hub ───────────── */

export function DataHub({ series, last }: { series: SeriesRow[]; last: IngestRun }) {
  const [filter, setFilter] = React.useState<Filter>("all");
  const [q, setQ] = React.useState("");
  const [openPanel, setOpenPanel] = React.useState<{ id: string; panel: "add" | "history" | "edit" } | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = React.useCallback((msg: string) => {
    setToast(msg);
    setOpenPanel(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  const held = (last?.results ?? []).filter((r) => r.status === "rejected");
  const heldSlugs = new Set(held.map((r) => r.slug));
  const stale = series.filter((s) => freshness(s) !== "fresh");
  const updatedToday = series.filter((s) => s.latest?.date === todayKarachi()).length;

  const visible = series.filter((s) => {
    if (filter === "auto" && !s.auto) return false;
    if (filter === "manual" && s.auto) return false;
    if (filter === "stale" && freshness(s) === "fresh") return false;
    if (filter === "held" && !heldSlugs.has(s.slug)) return false;
    if (q && !`${s.name} ${s.slug} ${s.sourceName ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const count = (f: Filter) => (f === "all" ? series.length : f === "auto" ? series.filter((s) => s.auto).length : f === "manual" ? series.filter((s) => !s.auto).length : f === "stale" ? stale.length : held.length);

  const toggle = (id: string, panel: "add" | "history" | "edit") => setOpenPanel((cur) => (cur && cur.id === id && cur.panel === panel ? null : { id, panel }));

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-px border border-line bg-[var(--border)] sm:grid-cols-4">
        <Stat label="Series" value={series.length} hint={`${series.filter((s) => s.auto).length} automatic`} />
        <Stat label="Updated today" value={updatedToday} hint="Pakistan time" />
        <Stat label="Stale" value={stale.length} hint={stale.length ? stale.slice(0, 3).map((s) => s.slug).join(", ") + (stale.length > 3 ? ", …" : "") : "all within their window"} />
        <Stat label="Held readings" value={held.length} hint={held.length ? "review below" : "nothing waiting"} />
      </div>

      <IngestPanel last={last} held={held} onDone={notify} />

      {toast ? (
        <p role="status" className="mt-4 border-l-2 border-[var(--text)] pl-3 text-[14px]">
          {toast}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={cn("inline-flex h-10 items-center gap-1.5 border-b-2 text-[14.5px] font-medium", filter === f.key ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-2 hover:text-[var(--text)]")}>
            {f.label}
            <span className="text-[12px] font-normal tabular text-3">{count(f.key)}</span>
          </button>
        ))}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a series" aria-label="Find a series" className="my-1 ml-auto h-8 w-48 border border-line bg-surface px-3 text-sm outline-none placeholder:text-[var(--text-3)] focus:border-ink-500" />
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-2">Nothing matches.</p>
      ) : (
        <div className="divide-y divide-[var(--border)] border-b border-line">
          {visible.map((s) => {
            const fresh = freshness(s);
            const panel = openPanel?.id === s.id ? openPanel.panel : null;
            return (
              <div key={s.id} className={cn(panel && "bg-surface")}>
                <div className="grid items-center gap-x-4 gap-y-2 py-3 md:grid-cols-[minmax(0,2fr)_120px_minmax(0,1.1fr)_minmax(0,1.2fr)_auto]">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium leading-snug">
                      <Link href={`/data/${s.slug}`} className="underline-offset-4 hover:underline">
                        {s.name}
                      </Link>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-3">{s.auto ? "auto" : "by hand"}</span>
                      {heldSlugs.has(s.slug) ? <Status value="pending" /> : null}
                    </p>
                    <p className="truncate text-[13px] text-3">
                      <span className="font-mono text-[12px]">{s.slug}</span> · {s.frequency}
                      {s.sourceName ? ` · ${s.sourceName}` : ""}
                    </p>
                  </div>
                  <Sparkline points={s.points} />
                  <div className="tabular">
                    {s.latest ? (
                      <>
                        <span className="text-[17px] font-semibold">{fmt(s.latest.value)}</span> <span className="text-[13px] text-3">{s.unit}</span>
                        <p className="text-[12.5px] text-3">
                          {formatDate(s.latest.date)}
                          {s.ageDays !== null ? ` · ${s.ageDays === 0 ? "today" : s.ageDays === 1 ? "yesterday" : `${s.ageDays} days ago`}` : ""}
                        </p>
                      </>
                    ) : (
                      <span className="text-3">no readings</span>
                    )}
                  </div>
                  <div className="text-[13.5px]">
                    {s.latest ? <Change latest={s.latest.value} previous={s.previous?.value ?? null} /> : null}
                    <p className="mt-0.5">
                      <Status value={fresh === "fresh" ? "active" : fresh === "stale" ? "expired" : "draft"} />
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant={panel === "add" ? "primary" : "outline"} onClick={() => toggle(s.id, "add")}>
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(s.id, "history")}>
                      History
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(s.id, "edit")}>
                      Edit
                    </Button>
                  </div>
                </div>
                {panel === "add" ? <AddPanel s={s} onDone={notify} /> : null}
                {panel === "history" ? <HistoryPanel s={s} onDone={notify} /> : null}
                {panel === "edit" ? <EditPanel s={s} onDone={notify} /> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
