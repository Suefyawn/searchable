"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Img } from "@/components/img";
import { cn } from "@/lib/utils";

export type Slide = { id: string; href: string; title: string; dek: string | null; imageUrl: string | null; label: string; meta: string };

const INTERVAL = 7000;

/**
 * Lead-story carousel. Auto-advances, pauses on hover/focus, honours prefers-reduced-motion, keyboard arrows.
 * Photo left, headline stack right; a thin progress rule shows the timer — no fades, no overlays (ADR-15/20).
 */
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const reduced = React.useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const n = slides.length;
  const go = React.useCallback((next: number) => {
    setI(((next % n) + n) % n);
    setTick((t) => t + 1);
  }, [n]);

  React.useEffect(() => {
    if (paused || reduced || n < 2) return;
    const id = setTimeout(() => go(i + 1), INTERVAL);
    return () => clearTimeout(id);
  }, [i, paused, reduced, n, go, tick]);

  if (!n) return null;
  const s = slides[i];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Top stories"
      className="grid gap-6 lg:grid-cols-12 lg:gap-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(i + 1);
        if (e.key === "ArrowLeft") go(i - 1);
      }}
    >
      <Link href={s.href} className="block lg:col-span-7" aria-hidden tabIndex={-1}>
        {s.imageUrl ? <Img src={s.imageUrl} alt="" aspect="3/2" priority sizes="(min-width: 1024px) 720px, 100vw" /> : <div className="bg-surface-2" style={{ aspectRatio: "3/2" }} />}
      </Link>
      <div className="flex flex-col lg:col-span-5" aria-live="polite">
        <p className="eyebrow">
          {s.label}
          <span className="ml-2 font-sans text-[11px] font-normal normal-case tracking-normal text-3">{s.meta}</span>
        </p>
        <h1 className="mt-3 font-serif text-[2.1rem] font-medium leading-[1.06] tracking-tight sm:text-[2.5rem] lg:text-[2.35rem] xl:text-[2.7rem]">
          <Link href={s.href} className="headline-link">
            {s.title}
          </Link>
        </h1>
        {s.dek ? <p className="mt-4 max-w-xl font-serif text-[1.1rem] leading-relaxed text-2">{s.dek}</p> : null}
        <Link href={s.href} className="mt-5 inline-block text-sm font-medium underline underline-offset-4">
          Read the story →
        </Link>

        {n > 1 ? (
          <div className="mt-auto pt-8">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => go(i - 1)} className="border border-line p-1.5 hover:bg-surface-2" aria-label="Previous story">
                <ChevronLeft className="size-4" />
              </button>
              <ol className="flex flex-1 gap-2" aria-label="Stories">
                {slides.map((x, k) => (
                  <li key={x.id} className="flex-1">
                    <button type="button" onClick={() => go(k)} aria-label={`Story ${k + 1}: ${x.title}`} aria-current={k === i} className="block h-6 w-full">
                      <span className={cn("block h-[2px] w-full bg-[var(--border)]")}>
                        <span key={k === i ? tick : `idle-${k}`} className={cn("block h-full bg-[var(--text)]", k < i ? "w-full" : k === i ? "hero-progress" : "w-0")} style={k === i ? { animationDuration: `${INTERVAL}ms`, animationPlayState: paused || reduced ? "paused" : "running" } : undefined} />
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <button type="button" onClick={() => go(i + 1)} className="border border-line p-1.5 hover:bg-surface-2" aria-label="Next story">
                <ChevronRight className="size-4" />
              </button>
              <span className="w-10 text-right text-xs tabular text-3">
                {i + 1} / {n}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
