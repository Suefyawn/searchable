"use client";

import Link from "next/link";
import * as React from "react";
import type { FeedItem } from "@/lib/activity";
import { cn } from "@/lib/utils";

const REFRESH_MS = 120_000;

function clock(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Karachi" });
}
function day(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString() ? "" : d.toLocaleDateString("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
}

/**
 * LIVE panel: a log of what changed — our stories, press headlines, data readings — refreshed from /api/feed.
 * Mono timestamps, a pulsing dot, nothing else moving.
 */
export function LiveFeed({ initial, limit = 12, className }: { initial: FeedItem[]; limit?: number; className?: string }) {
  const [items, setItems] = React.useState(initial);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/feed", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: FeedItem[]; at: string };
        if (alive) {
          setItems(data.items);
          setUpdatedAt(data.at);
        }
      } catch {
        /* keep what we have */
      }
    };
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <aside className={cn("flex flex-col border border-line", className)} aria-label="Live feed">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-3">Latest · live</p>
        <p className="flex items-center gap-1.5 font-mono text-[11px] text-3">
          <span className="live-dot" aria-hidden />
          {updatedAt ? `updated ${clock(updatedAt)}` : "live"}
        </p>
      </div>
      <ol className="divide-y divide-[var(--border)]">
        {items.slice(0, limit).map((it) => (
          <li key={`${it.kind}:${it.url}`} className="grid grid-cols-[3.2rem_1fr] gap-3 px-4 py-2.5 text-[14px] leading-snug">
            <span className="pt-0.5 font-mono text-[11px] text-3">
              {clock(it.at)}
              {day(it.at) ? <span className="block">{day(it.at)}</span> : null}
            </span>
            <span>
              {it.external ? (
                <a href={it.url} target="_blank" rel="noopener" className="headline-link">
                  {it.title}
                </a>
              ) : (
                <Link href={it.url} className="headline-link">
                  {it.title}
                </Link>
              )}
              <span className={cn("ml-2 font-mono text-[10.5px] uppercase tracking-wider", it.kind === "data" ? "text-brand-700" : "text-3")}>{it.label}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-auto border-t border-line px-4 py-2 text-[12px] text-3">
        Press headlines link to their publishers.{" "}
        <Link href="/news" className="underline-offset-4 hover:underline">
          All news →
        </Link>
      </p>
    </aside>
  );
}
