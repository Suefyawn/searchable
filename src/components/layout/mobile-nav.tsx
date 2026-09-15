"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { SearchBox } from "./search-box";

type Section = { key: string; label: string; href: string; links: { href: string; label: string }[] };

export function MobileNav({ nav, sections = [] }: { nav: { href: string; label: string }[]; sections?: Section[] }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-10 place-items-center text-[var(--text)]">
        <Menu className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-[var(--bg)]">
          <div className="container-x flex h-14 items-center justify-between border-b border-line">
            <span className="font-serif text-xl">Menu</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center">
              <X className="size-5" />
            </button>
          </div>
          <div className="container-x space-y-6 pt-4">
            <SearchBox autoFocus />
            <nav className="divide-y divide-[var(--border)] border-y border-line" aria-label="Mobile">
              {nav.map((n) => {
                const sec = sections.find((s) => s.href === n.href);
                return (
                  <div key={n.href}>
                    <div className="flex items-center justify-between">
                      <Link href={n.href} onClick={() => setOpen(false)} className="block py-3.5 font-serif text-2xl">
                        {n.label}
                      </Link>
                      {sec?.links.length ? (
                        <button type="button" onClick={() => setExpanded((e) => (e === sec.key ? null : sec.key))} aria-expanded={expanded === sec.key} aria-label={`${expanded === sec.key ? "Collapse" : "Expand"} ${n.label}`} className="px-3 py-2 text-2">
                          {expanded === sec.key ? "−" : "+"}
                        </button>
                      ) : null}
                    </div>
                    {sec && expanded === sec.key ? (
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 pb-3">
                        {sec.links.map((l) => (
                          <li key={l.href + l.label}>
                            <Link href={l.href} onClick={() => setOpen(false)} className="block truncate py-1 text-[15px] text-2">
                              {l.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
              <Link href="/newsletter" onClick={() => setOpen(false)} className="block py-3.5 font-serif text-2xl">
                Newsletter
              </Link>
              <Link href="/account" onClick={() => setOpen(false)} className="block py-3.5 font-serif text-2xl">
                Account
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
