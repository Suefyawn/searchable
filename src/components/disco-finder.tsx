"use client";

import Link from "next/link";
import * as React from "react";
import type { Disco } from "@/content/discos";

/**
 * "Which company sends my bill?" Type a city or town and the matching distribution company appears with its
 * bill portal. Matching is on the company's listed cities plus its region words, forgiving of spelling.
 */
export function DiscoFinder({ discos }: { discos: Pick<Disco, "slug" | "short" | "name" | "region" | "cities" | "billUrl" | "billUrlLabel">[] }) {
  const [q, setQ] = React.useState("");
  const needle = q.trim().toLowerCase();
  const hits = needle.length < 2 ? [] : discos.filter((d) => [...d.cities, d.region, d.short, d.name].some((c) => c.toLowerCase().includes(needle))).slice(0, 4);
  return (
    <div className="border-y-2 border-[var(--rule)] py-4">
      <label htmlFor="disco-city" className="eyebrow">
        Which company sends my bill?
      </label>
      <div className="mt-2 flex max-w-md items-center gap-2">
        <input id="disco-city" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type your city or town, e.g. Sialkot" className="h-10 w-full border border-line bg-surface px-3 text-[15px] outline-none placeholder:text-[var(--text-3)] focus:border-ink-500" autoComplete="off" />
      </div>
      {needle.length >= 2 ? (
        hits.length ? (
          <ul className="mt-3 divide-y divide-[var(--border)] border-y border-line">
            {hits.map((d) => (
              <li key={d.slug} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-[15px]">
                <span>
                  <Link href={`/electricity/${d.slug}`} className="font-medium underline-offset-4 hover:underline">
                    {d.short}
                  </Link>{" "}
                  <span className="text-2">· {d.name} · {d.region}</span>
                </span>
                <a href={d.billUrl} target="_blank" rel="noopener noreferrer" className="text-[14px] underline underline-offset-4">
                  Check bill at {d.billUrlLabel}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[14px] text-2">No match. Try the nearest big city; K-Electric covers Karachi only, everything else is a WAPDA company.</p>
        )
      ) : null}
    </div>
  );
}
