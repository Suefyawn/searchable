"use client";

import { Search } from "lucide-react";
import * as React from "react";
import { importOpenImageAction, searchOpenImagesAction } from "@/app/admin/articles/image-actions";
import { Button, Input } from "@/components/ui";
import type { OpenImage } from "@/lib/open-images";
import { cn } from "@/lib/utils";

/**
 * Search openly licensed photos (Openverse: Flickr, Wikimedia Commons…) and import one.
 * Returns the stored URL plus the credit line and source page so the caller can save attribution.
 */
export function OpenImagePicker({ onPick, variant = "article", initialQuery = "", className }: { onPick: (img: { url: string; credit: string; sourceUrl: string; alt: string }) => void; variant?: "article" | "cover" | "photo"; initialQuery?: string; className?: string }) {
  const [q, setQ] = React.useState(initialQuery);
  const [results, setResults] = React.useState<OpenImage[]>([]);
  const [busy, setBusy] = React.useState<"search" | string | null>(null);
  const [error, setError] = React.useState("");
  const [open, setOpen] = React.useState(false);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (q.trim().length < 2) return;
    setBusy("search");
    setError("");
    const r = await searchOpenImagesAction(q);
    setResults(r.results);
    setError(r.error ?? (r.results.length ? "" : "No openly licensed photos found — try a broader or English query."));
    setBusy(null);
  }

  async function pick(img: OpenImage) {
    setBusy(img.id);
    setError("");
    try {
      const stored = await importOpenImageAction(img, variant);
      onPick({ url: stored.url, credit: stored.credit, sourceUrl: stored.sourceUrl, alt: img.title });
      setOpen(false);
      setResults([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={className}>
      {!open ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Search className="size-3.5" /> Find an openly licensed photo
        </Button>
      ) : (
        <div className="border border-line p-3">
          <form onSubmit={search} className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Lahore Badshahi Mosque, petrol pump Karachi, solar panels rooftop" className="h-9 text-sm" autoFocus />
            <Button type="submit" size="sm" disabled={busy === "search"}>
              {busy === "search" ? "Searching…" : "Search"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
          </form>
          <p className="mt-1.5 text-xs text-3">CC0, public domain, CC BY and CC BY-SA photos from Flickr, Wikimedia Commons and others. The credit is saved and shown under the image. Never AI-generated.</p>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          {results.length ? (
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {results.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => pick(r)} disabled={busy !== null} className={cn("group block w-full text-left", busy === r.id && "opacity-60")} title={r.title}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.thumbnail} alt={r.title} loading="lazy" className="aspect-[4/3] w-full border border-line object-cover group-hover:border-ink-500" />
                    <span className="mt-1 block truncate text-[11px] text-2">{r.creator ?? "Unknown"} · {r.license === "pdm" ? "PD" : r.license.toUpperCase()} · {r.source}</span>
                    {busy === r.id ? <span className="block text-[11px] text-3">Importing…</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
