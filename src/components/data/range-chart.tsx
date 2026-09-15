"use client";

import * as React from "react";
import { LineChart } from "@/components/data/line-chart";
import { cn } from "@/lib/utils";

type Point = { date: string; value: number };
const RANGES = [
  { key: "1m", label: "1 month", days: 31 },
  { key: "3m", label: "3 months", days: 93 },
  { key: "1y", label: "1 year", days: 366 },
  { key: "all", label: "All", days: Infinity },
] as const;

/**
 * The series chart with its range tabs, switched in the browser so the page stays static: every reading is
 * already on the page for the history table. Never fewer than the last eight readings, so a fortnightly series
 * still draws a line on "1 month".
 */
export function RangeChart({ points, unit }: { points: Point[]; unit: string }) {
  const [key, setKey] = React.useState<(typeof RANGES)[number]["key"]>("3m");
  const range = RANGES.find((r) => r.key === key) ?? RANGES[1];
  const latest = points[points.length - 1];
  const cutoff = latest && Number.isFinite(range.days) ? new Date(new Date(latest.date).getTime() - range.days * 86_400_000).toISOString().slice(0, 10) : "0000-00-00";
  const inRange = points.filter((p) => p.date >= cutoff);
  const shown = inRange.length >= 8 ? inRange : points.slice(-8);
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-3">History</h2>
        {points.length >= 8 ? (
          <div className="flex gap-1 text-[13px]" role="group" aria-label="Chart range">
            {RANGES.map((r) => (
              <button key={r.key} type="button" onClick={() => setKey(r.key)} aria-pressed={r.key === key} className={cn("border px-2.5 py-1", r.key === key ? "border-[var(--text)] font-medium" : "border-line text-2 hover:bg-surface-2")}>
                {r.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="text-brand-700">
        <LineChart points={shown} unit={unit} />
      </div>
    </section>
  );
}
