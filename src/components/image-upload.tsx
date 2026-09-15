"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "article" | "logo" | "cover" | "photo" | "evidence";

export type UploadedImage = { url: string; width: number; height: number };

async function upload(file: File, variant: Variant, businessId?: string, alt?: string): Promise<UploadedImage> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("variant", variant);
  if (businessId) fd.set("businessId", businessId);
  if (alt) fd.set("alt", alt);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = (await res.json()) as UploadedImage & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data;
}

/** Single image: drop zone with preview. `value` is the stored URL; `onChange` receives the new URL (or ""). */
export function ImageUpload({ value, onChange, variant, businessId, label = "Upload image", aspect = "16/9", className }: { value?: string; onChange: (url: string) => void; variant: Variant; businessId?: string; label?: string; aspect?: string; className?: string }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const img = await upload(file, variant, businessId);
      onChange(img.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      {value ? (
        <div className="relative border border-line bg-surface-2" style={{ aspectRatio: aspect }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className={cn("h-full w-full", variant === "logo" ? "object-contain p-3" : "object-cover")} />
          <div className="absolute inset-x-0 bottom-0 flex justify-between gap-2 bg-[var(--bg)]/90 p-2 text-xs">
            <button type="button" onClick={() => inputRef.current?.click()} className="font-medium underline-offset-4 hover:underline" disabled={busy}>
              {busy ? "Uploading…" : "Replace"}
            </button>
            <button type="button" onClick={() => onChange("")} className="inline-flex items-center gap-1 text-rose-700 underline-offset-4 hover:underline">
              <Trash2 className="size-3.5" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void handle(e.dataTransfer.files?.[0]);
          }}
          disabled={busy}
          className={cn("flex w-full flex-col items-center justify-center gap-2 border border-dashed p-6 text-sm text-2 transition-colors hover:bg-surface-2", drag ? "border-ink-600 bg-surface-2" : "border-ink-300 dark:border-ink-600")}
          style={{ aspectRatio: aspect, maxHeight: 220 }}
        >
          <ImagePlus className="size-5" />
          <span className="font-medium">{busy ? "Uploading…" : label}</span>
          <span className="text-xs text-3">Drop a file or click · JPEG, PNG, WebP · up to 8 MB</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => void handle(e.target.files?.[0])} />
      {error ? <p className="mt-1.5 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

/** Multiple images (business photo gallery). */
export function ImageGalleryUpload({ value, onChange, businessId, max = 12 }: { value: { url: string; alt?: string }[]; onChange: (v: { url: string; alt?: string }[]) => void; businessId?: string; max?: number }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    const next = [...value];
    try {
      for (const f of Array.from(files).slice(0, max - value.length)) {
        const img = await upload(f, "photo", businessId);
        next.push({ url: img.url });
      }
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      onChange(next);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((p, i) => (
          <div key={p.url} className="group relative aspect-square border border-line bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.alt ?? ""} className="h-full w-full object-cover" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove photo" className="absolute right-1 top-1 bg-[var(--bg)]/90 p-1 text-rose-700 opacity-0 transition-opacity group-hover:opacity-100">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {value.length < max ? (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="flex aspect-square flex-col items-center justify-center gap-1 border border-dashed border-ink-300 text-xs text-2 hover:bg-surface-2 dark:border-ink-600">
            <ImagePlus className="size-4" />
            {busy ? "Uploading…" : "Add photos"}
          </button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => void handle(e.target.files)} />
      {error ? <p className="mt-1.5 text-sm text-rose-700">{error}</p> : null}
      <p className="mt-1.5 text-xs text-3">
        {value.length}/{max} photos. The first photo is shown on the listing.
      </p>
    </div>
  );
}
