"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { SearchBox } from "./search-box";

export function MobileNav({ nav }: { nav: { href: string; label: string }[] }) {
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
              {nav.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-3.5 font-serif text-2xl">
                  {n.label}
                </Link>
              ))}
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
