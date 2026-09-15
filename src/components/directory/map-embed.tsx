"use client";

import { MapPin } from "lucide-react";
import * as React from "react";

/**
 * Click-to-load OpenStreetMap embed. Nothing third-party loads until the reader asks for it
 * (privacy + page weight); no map library dependency (ADR-17). Interactive maps with many pins
 * come with MapLibre when local search ships.
 */
export function MapEmbed({ lat, lng, name, className = "" }: { lat: number; lng: number; name: string; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const d = 0.006;
  const bbox = `${(lng - d).toFixed(5)},${(lat - d).toFixed(5)},${(lng + d).toFixed(5)},${(lat + d).toFixed(5)}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`flex w-full items-center justify-center gap-2 border border-line bg-surface-2 py-8 text-sm text-2 hover:text-[var(--text)] ${className}`} style={{ aspectRatio: "16/9" }}>
        <MapPin className="size-4" /> Show map of {name}
      </button>
    );
  }
  return (
    <figure className={className}>
      <iframe title={`Map of ${name}`} src={src} className="w-full border border-line" style={{ aspectRatio: "16/9" }} loading="lazy" referrerPolicy="no-referrer" />
      <figcaption className="mt-1 text-[11px] text-3">
        Map data © <a href="https://www.openstreetmap.org/copyright" rel="noopener" target="_blank" className="underline-offset-2 hover:underline">OpenStreetMap</a> contributors ·{" "}
        <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`} rel="noopener" target="_blank" className="underline-offset-2 hover:underline">Larger map</a>
      </figcaption>
    </figure>
  );
}
