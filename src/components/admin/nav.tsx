"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type AdminNavGroup = { title: string; items: { href: string; label: string; count?: number }[] };

/** Grouped sidebar with the current section marked and pending counts beside queues. */
export function AdminNav({ groups }: { groups: AdminNavGroup[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-6 overflow-x-auto no-scrollbar lg:flex-col lg:gap-5" aria-label="Admin">
      {groups.map((g) => (
        <div key={g.title} className="shrink-0">
          <p className="mb-1 px-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-3">{g.title}</p>
          <ul className="flex gap-0.5 lg:flex-col">
            {g.items.map((n) => {
              const active = n.href === "/admin" ? pathname === "/admin" : pathname === n.href || pathname.startsWith(n.href + "/");
              return (
                <li key={n.href}>
                  <Link href={n.href} className={cn("flex items-center justify-between gap-3 whitespace-nowrap border-l-2 px-2 py-1 text-[14.5px]", active ? "border-[var(--text)] font-medium text-[var(--text)]" : "border-transparent text-2 hover:text-[var(--text)]")}>
                    {n.label}
                    {n.count ? <span className="min-w-5 bg-ink-900 px-1.5 text-center text-[11px] font-semibold tabular text-white">{n.count > 99 ? "99+" : n.count}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
