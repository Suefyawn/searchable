"use client";

import Link from "next/link";
import * as React from "react";

type Row = { o: string; c: string; a: string; s: string; p: string };

/** Type a post office, town or code; matches appear as you type. The list is small enough to ship with the page. */
export function PostalSearch({ rows }: { rows: Row[] }) {
  const [q, setQ] = React.useState("");
  const term = q.trim().toLowerCase();
  const hits = term.length >= 2 ? rows.filter((r) => r.o.toLowerCase().includes(term) || r.c.startsWith(term) || r.a.toLowerCase().includes(term)).slice(0, 40) : [];
  return (
    <div>
      <label htmlFor="postal-q" className="sr-only">
        Search post offices and codes
      </label>
      <input id="postal-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Post office, town or code, e.g. Gulberg, Sialkot, 54000" className="h-12 w-full border border-line bg-[var(--bg)] px-4 text-[16px] outline-none focus:border-[var(--text)]" autoComplete="off" />
      {term.length >= 2 ? (
        hits.length ? (
          <table className="mt-3 w-full text-[14.5px] tabular">
            <thead>
              <tr className="border-b-2 border-[var(--rule)] text-left text-[12px] uppercase tracking-[0.08em] text-3">
                <th className="py-2 pr-3 font-semibold">Post office</th>
                <th className="py-2 pr-3 font-semibold">Code</th>
                <th className="py-2 font-semibold">Under</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((r) => (
                <tr key={`${r.c}-${r.o}`} className="border-b border-line">
                  <td className="py-2 pr-3">
                    {r.o} <span className="text-[12px] text-3">{r.p}</span>
                  </td>
                  <td className="py-2 pr-3 font-semibold">{r.c}</td>
                  <td className="py-2">
                    <Link href={`/postal-codes/${r.s}`} className="underline-offset-4 hover:underline">
                      {r.a}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-[15px] text-2">No post office matches. Try the town&apos;s name, or the nearest big city below.</p>
        )
      ) : null}
    </div>
  );
}
