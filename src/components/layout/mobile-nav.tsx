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
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid size-10 place-items-center rounded-md text-2 hover:bg-surface-2">
        <Menu className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-[var(--bg)]">
          <div className="container-x flex h-16 items-center justify-between">
            <span className="font-semibold">Menu</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-md text-2 hover:bg-surface-2">
              <X className="size-5" />
            </button>
          </div>
          <div className="container-x space-y-6 pt-2">
            <SearchBox autoFocus />
            <nav className="grid gap-1" aria-label="Mobile">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-lg font-medium hover:bg-surface-2">
                  {n.label}
                </Link>
              ))}
              <Link href="/newsletter" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-lg font-medium hover:bg-surface-2">
                Newsletter
              </Link>
              <Link href="/account" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-lg font-medium hover:bg-surface-2">
                Account
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
