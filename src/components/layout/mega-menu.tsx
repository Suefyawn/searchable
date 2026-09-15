"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import type { MegaSection } from "@/lib/mega-nav";
import { cn } from "@/lib/utils";

/**
 * Desktop navigation with a full-width panel per section. Opens on hover or focus, closes on leave, Escape,
 * outside click or route change. Panel is a plain white sheet with hairlines and small-caps column titles.
 */
export function MegaMenu({ sections }: { sections: MegaSection[] }) {
  const [open, setOpen] = React.useState<string | null>(null);
  const pathname = usePathname();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close when the route changes (render-time derivation, no effect).
  const [seenPath, setSeenPath] = React.useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(null);
  }
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const show = (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(key);
  };
  const hide = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  };
  const active = sections.find((s) => s.key === open);

  return (
    <div ref={rootRef} className="contents" onMouseLeave={hide}>
      <nav className="ml-4 hidden items-center gap-5 lg:flex" aria-label="Primary">
        {sections.map((s) => {
          const current = pathname === s.href || pathname.startsWith(s.href + "/");
          return (
            <div key={s.key} className="relative" onMouseEnter={() => show(s.key)}>
              <Link
                href={s.href}
                aria-expanded={open === s.key}
                aria-haspopup="true"
                onFocus={() => show(s.key)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    show(s.key);
                    (rootRef.current?.querySelector(`[data-panel="${s.key}"] a`) as HTMLElement | null)?.focus();
                  }
                }}
                className={cn("inline-flex h-16 items-center border-b-2 text-[14.5px] font-medium transition-colors", open === s.key || current ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-2 hover:text-[var(--text)]")}
              >
                {s.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {active ? (
        <div data-panel={active.key} className="absolute inset-x-0 top-full z-40 hidden border-b border-line bg-[var(--bg)] shadow-[0_12px_24px_-16px_rgba(0,0,0,0.25)] lg:block" onMouseEnter={() => show(active.key)} onMouseLeave={hide}>
          <div className="container-x">
            <div className="grid gap-x-8 gap-y-6 py-6" style={{ gridTemplateColumns: `repeat(${Math.min(active.columns.length, 5)}, minmax(0, 1fr))` }}>
              {active.columns.slice(0, 5).map((col, i) => (
                <div key={`${col.title}-${i}`} className={cn(i > 0 && "border-l border-line pl-6")}>
                  {col.href ? (
                    <Link href={col.href} className="eyebrow block hover:underline underline-offset-4">
                      {col.title}
                    </Link>
                  ) : (
                    <p className="eyebrow">{col.title}</p>
                  )}
                  <ul className="mt-2.5 space-y-1.5">
                    {col.links.map((l) => (
                      <li key={l.href + l.label}>
                        <Link href={l.href} className="flex items-baseline justify-between gap-3 text-[14.5px] leading-snug text-[var(--text)] underline-offset-4 hover:underline">
                          <span className="min-w-0 line-clamp-2">{l.label}</span>
                          {l.meta ? <span className="shrink-0 text-[12px] tabular text-3">{l.meta}</span> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {active.footer ? (
              <div className="flex items-center justify-between border-t border-line py-2.5 text-[13px]">
                <Link href={active.footer.href} className="font-medium underline-offset-4 hover:underline">
                  {active.footer.label} →
                </Link>
                <span className="text-3">Esc to close</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
