"use client";

import Link from "next/link";
import * as React from "react";
import { Change } from "@/components/data/change";
import { number } from "@/lib/format";

export type TickerItem = { id: string; slug: string; name: string; unit: string; value: number; previous: number | null };

/**
 * The numbers strip under the masthead: a slow, continuous ticker like a broadcast rail. The track is
 * rendered twice so the loop is seamless; it pauses on hover and focus, and with reduced motion (or when
 * everything fits) it is simply a scrollable row. Speed is set from the track length so it reads at
 * walking pace on every screen.
 */
export function NumbersTicker({ items }: { items: TickerItem[] }) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<{ duration: number; animate: boolean }>({ duration: 60, animate: false });

  React.useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const measure = () => {
      const half = el.scrollWidth / 2;
      const fits = half <= (el.parentElement?.clientWidth ?? 0);
      // 45 px a second: readable, unhurried.
      setState({ duration: Math.max(20, Math.round(half / 45)), animate: !reduced && !fits });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length]);

  const cell = (s: TickerItem, k: string, hidden: boolean) => (
    <Link key={k} href={`/data/${s.slug}`} className="flex shrink-0 items-baseline gap-2 border-r border-line px-4 py-2.5 text-[13px] hover:bg-surface-2" aria-hidden={hidden} tabIndex={hidden ? -1 : 0}>
      <span className="text-3">{s.name}</span>
      <span className="font-medium tabular">{s.unit === "%" ? `${number(s.value, 2)}%` : number(s.value, Number.isInteger(s.value) ? 0 : 2)}</span>
      <Change latest={s.value} previous={s.previous} unit={s.unit} />
    </Link>
  );

  return (
    <section className="group -mx-5 overflow-x-auto no-scrollbar border-b border-line sm:mx-0" aria-label="Today's numbers">
      <div ref={trackRef} className="flex w-max" style={state.animate ? { animation: `ticker ${state.duration}s linear infinite` } : undefined}>
        {items.map((s) => cell(s, s.id, false))}
        {state.animate ? items.map((s) => cell(s, `${s.id}-dup`, true)) : null}
      </div>
      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .group:hover > div, .group:focus-within > div { animation-play-state: paused !important; }
      `}</style>
    </section>
  );
}
