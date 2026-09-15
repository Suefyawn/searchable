"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Img } from "@/components/img";
import { srcSetFor } from "@/lib/images";
import { cn } from "@/lib/utils";

export type Slide = { id: string; href: string; title: string; dek: string | null; imageUrl: string | null; label: string; meta: string };

const INTERVAL = 7000;
const SIZES = "(min-width: 1024px) 800px, 100vw";

/**
 * Lead-story carousel. Auto-advances, pauses on hover/focus, honours prefers-reduced-motion, keyboard arrows.
 * Photo left, headline stack right; a thin progress rule shows the timer, no fades, no overlays (ADR-15/20).
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

  // The next slide's photo is fetched a couple of seconds into the current one, in the rendition the browser
  // would choose anyway, so a rotation never shows an empty frame while the image arrives from the CDN.
  React.useEffect(() => {
    if (n < 2) return;
    const next = slides[(i + 1) % n];
    if (!next.imageUrl) return;
    const id = setTimeout(() => {
      const img = new Image();
      img.sizes = SIZES;
      img.srcset = srcSetFor(next.imageUrl!) ?? "";
      img.src = next.imageUrl!;
    }, 2000);
    return () => clearTimeout(id);
  }, [i, n, slides]);

  if (!n) return null;
  const s = slides[i];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Top stories"
      className="grid gap-4 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(i + 1);
        if (e.key === "ArrowLeft") go(i - 1);
      }}
    >
      <Link href={s.href} className="block lg:col-span-12" aria-hidden tabIndex={-1}>
        {s.imageUrl ? <Img src={s.imageUrl} alt="" aspect="16/9" priority={i === 0} sizes={SIZES} /> : <div className="bg-surface-2" style={{ aspectRatio: "16/9" }} />}
      </Link>
      {/* Every slide's text is laid out in the same grid cell, hidden ones invisible, so the block keeps the
          height of the tallest slide and the page below never jumps when the headline length changes. */}
      <div className="grid lg:col-span-7" aria-live="polite">
        {slides.map((x, k) => (
          <div key={x.id} className={cn("[grid-area:1/1]", k !== i && "invisible")} aria-hidden={k !== i}>
            <p className="eyebrow">
              {x.label}
              <span className="ml-2 font-sans text-[11px] font-normal normal-case tracking-normal text-3">{x.meta}</span>
            </p>
            <h1 className="mt-2 font-serif text-[1.9rem] font-medium leading-[1.08] tracking-tight sm:text-[2.3rem] lg:text-[2.2rem] xl:text-[2.5rem]">
              <Link href={x.href} className="headline-link" tabIndex={k === i ? 0 : -1}>
                {x.title}
              </Link>
            </h1>
          </div>
        ))}
      </div>
      <div className="flex flex-col lg:col-span-5">
        <div className="grid">
          {slides.map((x, k) => (
            <div key={x.id} className={cn("[grid-area:1/1]", k !== i && "invisible")} aria-hidden={k !== i}>
              {x.dek ? <p className="font-serif text-[1.05rem] leading-relaxed text-2 lg:pt-6">{x.dek}</p> : null}
              <Link href={x.href} className="mt-3 inline-block text-sm font-medium underline underline-offset-4" tabIndex={k === i ? 0 : -1}>
                Read the story →
              </Link>
            </div>
          ))}
        </div>
        {n > 1 ? (
          <div className="mt-auto pt-5">
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
