"use client";

import { ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Dropzone, ProgressRule } from "./dropzone";
import { ErrorLine } from "./image-upload";
import { IMAGE_ACCEPT, ValidationError, uploadImage, type UploadVariant } from "./upload-client";

export type GalleryImage = { url: string; alt?: string };
type Pending = { id: string; preview: string; name: string; fraction: number; error?: string; retryable?: boolean; file: File; controller: AbortController };

/**
 * Many images: drop or pick several at once, each uploads in parallel with its own progress, then reorder
 * with the arrows (or drag a tile), caption, remove. The first tile is the cover.
 */
export function GalleryUpload({ value, onChange, variant = "photo", businessId, max = 12, withAlt = false, tile = "aspect-square", className, disabled }: { value: GalleryImage[]; onChange: (v: GalleryImage[]) => void; variant?: Exclude<UploadVariant, "cv">; businessId?: string; max?: number; withAlt?: boolean; tile?: string; className?: string; disabled?: boolean }) {
  const [pending, setPending] = React.useState<Pending[]>([]);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  // Refs so parallel uploads that finish in the same tick append to the latest list, not a stale render.
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const pendingRef = React.useRef(0);
  pendingRef.current = pending.length;
  const room = max - value.length - pending.length;
  const commit = (next: GalleryImage[]) => {
    valueRef.current = next;
    onChange(next);
  };

  React.useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function start(files: File[]) {
    if (disabled) return;
    const slots = Math.max(0, max - valueRef.current.length - pendingRef.current);
    const picked = files.slice(0, slots);
    if (!picked.length) return;
    const items: Pending[] = picked.map((file) => ({ id: crypto.randomUUID(), preview: URL.createObjectURL(file), name: file.name, fraction: 0, file, controller: new AbortController() }));
    pendingRef.current += items.length;
    setPending((p) => [...p, ...items]);
    items.forEach((it) => void run(it));
  }

  async function run(it: Pending) {
    try {
      const res = await uploadImage(it.file, { variant, businessId, signal: it.controller.signal, onProgress: (f) => setPending((p) => p.map((x) => (x.id === it.id ? { ...x, fraction: f } : x))) });
      commit([...valueRef.current, { url: res.url }]);
      setPending((p) => p.filter((x) => x.id !== it.id));
      URL.revokeObjectURL(it.preview);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setPending((p) => p.filter((x) => x.id !== it.id));
        URL.revokeObjectURL(it.preview);
      } else setPending((p) => p.map((x) => (x.id === it.id ? { ...x, error: e instanceof Error ? e.message : "Upload failed", retryable: !(e instanceof ValidationError) } : x)));
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  }

  return (
    <div className={className}>
      <div className="@container">
      <div className="grid grid-cols-2 gap-2 @[22rem]:grid-cols-3 @[34rem]:grid-cols-4 @[48rem]:grid-cols-5">
        {value.map((p, i) => (
          <figure
            key={p.url}
            draggable={!disabled}
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (dragIndex !== null) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn("group relative overflow-hidden border border-line bg-surface-2", tile, dragIndex === i && "opacity-50")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.alt ?? ""} className="h-full w-full object-cover" draggable={false} />
            {i === 0 ? <span className="absolute left-1.5 top-1.5 bg-[var(--bg)]/92 px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em]">Cover</span> : null}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[var(--bg)]/92 px-1 py-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
              <span className="flex">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0 || disabled} aria-label="Move left" className="p-1 text-2 hover:text-[var(--text)] disabled:opacity-30">
                  <ChevronLeft className="size-4" />
                </button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === value.length - 1 || disabled} aria-label="Move right" className="p-1 text-2 hover:text-[var(--text)] disabled:opacity-30">
                  <ChevronRight className="size-4" />
                </button>
              </span>
              <button type="button" onClick={() => commit(value.filter((_, j) => j !== i))} disabled={disabled} aria-label="Remove photo" className="p-1 text-2 hover:text-[var(--text)]">
                <Trash2 className="size-4" />
              </button>
            </div>
            {withAlt ? <input value={p.alt ?? ""} onChange={(e) => commit(value.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} placeholder="Caption" maxLength={200} aria-label={`Caption for photo ${i + 1}`} className="absolute inset-x-0 top-0 h-7 w-full border-b border-line bg-[var(--bg)]/92 px-2 text-[12px] opacity-0 outline-none transition-opacity focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100" /> : null}
          </figure>
        ))}
        {pending.map((p) => (
          <div key={p.id} className={cn("relative overflow-hidden border border-line bg-surface-2", tile)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="h-full w-full object-cover opacity-60" />
            {p.error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[var(--bg)]/92 p-1 text-center text-[12px]">
                <span className="font-medium">Failed</span>
                <span className="flex gap-2">
                  {p.retryable ? (
                    <button type="button" className="underline underline-offset-4" onClick={() => { setPending((x) => x.map((y) => (y.id === p.id ? { ...y, error: undefined, fraction: 0 } : y))); void run(p); }}>
                      Retry
                    </button>
                  ) : null}
                  <button type="button" className="text-2 underline underline-offset-4" onClick={() => setPending((x) => x.filter((y) => y.id !== p.id))}>
                    Remove
                  </button>
                </span>
              </div>
            ) : (
              <>
                <span className="absolute left-1.5 top-1.5 bg-[var(--bg)]/92 px-1.5 py-0.5 text-[11px] tabular">{Math.round(p.fraction * 100)}%</span>
                <button type="button" onClick={() => p.controller.abort()} aria-label="Cancel" className="absolute right-1 top-1 bg-[var(--bg)]/92 p-1 hover:text-[var(--text)]">
                  <X className="size-3.5" />
                </button>
                <ProgressRule fraction={p.fraction} />
              </>
            )}
          </div>
        ))}
        {room > 0 ? (
          <Dropzone accept={IMAGE_ACCEPT} multiple onFiles={start} disabled={disabled} label="Add photos" className={cn("p-2", tile)}>
            <ImagePlus className="size-5 text-3" />
            <span className="text-[12.5px] font-medium text-[var(--text)]">Add photos</span>
            <span className="text-[11px] text-3">Drop, paste or browse</span>
          </Dropzone>
        ) : null}
      </div>
      </div>
      <p className="mt-1.5 text-[12px] text-3">
        {value.length}/{max}. The first photo is the cover; drag or use the arrows to reorder.
      </p>
      {pending.filter((p) => p.error).map((p) => (
        <ErrorLine key={p.id} message={`${p.name}: ${p.error}`} />
      ))}
    </div>
  );
}
