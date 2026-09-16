"use client";

import * as React from "react";

type Times = { fajr: number; sunrise: number; dhuhr: number; asr: number; maghrib: number; isha: number };
const ORDER: { key: keyof Times; label: string }[] = [
  { key: "fajr", label: "Fajr" },
  { key: "sunrise", label: "Sunrise" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
];

function pkHours(): number {
  const t = new Date(Date.now() + 5 * 3_600_000);
  return t.getUTCHours() + t.getUTCMinutes() / 60 + t.getUTCSeconds() / 3600;
}

function subscribeTick(cb: () => void) {
  const id = setInterval(cb, 30_000);
  return () => clearInterval(id);
}

function span(h: number): string {
  const mins = Math.max(0, Math.round(h * 60));
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return hh ? `${hh} h ${mm} min` : `${mm} min`;
}

/**
 * "Next: Asr in 2 h 14 min", computed on the reader's clock in Pakistan time so the page itself can stay
 * cached for the day. Renders nothing until mounted, so server and client markup agree.
 */
export function NextPrayer({ today, tomorrowFajr }: { today: Times; tomorrowFajr: number }) {
  // Subscribes to a half-minute tick; the server snapshot is null so the first paint matches the HTML.
  const now = React.useSyncExternalStore(subscribeTick, pkHours, () => null);
  if (now === null) return <p className="h-6" aria-hidden />;
  const next = ORDER.find((p) => now < today[p.key]);
  const label = next ? next.label : "Fajr";
  const at = next ? today[next.key] : tomorrowFajr + 24;
  return (
    <p className="text-[15px]">
      <span className="eyebrow mr-2">Next</span>
      <span className="font-semibold">{label}</span> in {span(at - now)}
    </p>
  );
}
