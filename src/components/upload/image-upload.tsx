"use client";

import { ImagePlus, RefreshCw, Trash2, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Dropzone, ProgressRule } from "./dropzone";
import { IMAGE_ACCEPT, ValidationError, humanSize, uploadImage, type UploadVariant, type Uploaded } from "./upload-client";

type Props = {
  value?: string;
  onChange: (url: string, info?: Uploaded) => void;
  variant: Exclude<UploadVariant, "cv">;
  businessId?: string;
  label?: string;
  /** CSS aspect ratio of the box, e.g. "16/9", "1/1". */
  aspect?: string;
  hint?: string;
  className?: string;
  /** Optional alt text field under the preview. */
  alt?: { value: string; onChange: (v: string) => void; placeholder?: string };
  disabled?: boolean;
};

type Phase = { kind: "idle"; info?: Uploaded } | { kind: "uploading"; preview: string; name: string; size: number; fraction: number } | { kind: "error"; message: string; file?: File };

const HINTS: Partial<Record<UploadVariant, string>> = {
  logo: "Square works best. PNG with a transparent background if you have one.",
  cover: "Wide, at least 1600 px across. It is cropped to a strip.",
  avatar: "Square, face visible.",
  article: "At least 1200 px wide for Google Discover.",
  evidence: "A clear photo or scan; account numbers can be covered.",
};

/**
 * One image: drop, paste or browse; instant local preview with real upload progress; replace, remove, retry.
 * Big photos are shrunk in the browser before they leave the device.
 */
export function ImageUpload({ value, onChange, variant, businessId, label = "Upload an image", aspect = "16/9", hint, className, alt, disabled }: Props) {
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" });
  const abortRef = React.useRef<AbortController | null>(null);
  const previewRef = React.useRef<string | null>(null);

  React.useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    abortRef.current?.abort();
  }, []);

  async function handle(files: File[]) {
    const file = files[0];
    if (!file || disabled) return;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const preview = URL.createObjectURL(file);
    previewRef.current = preview;
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase({ kind: "uploading", preview, name: file.name, size: file.size, fraction: 0 });
    try {
      const res = await uploadImage(file, { variant, businessId, alt: alt?.value, signal: ac.signal, onProgress: (f) => setPhase((p) => (p.kind === "uploading" ? { ...p, fraction: f } : p)) });
      onChange(res.url, res);
      setPhase({ kind: "idle", info: res });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") setPhase({ kind: "idle" });
      else setPhase({ kind: "error", message: e instanceof Error ? e.message : "Upload failed", file: e instanceof ValidationError ? undefined : file });
    }
  }

  const contain = variant === "logo";
  const box = { aspectRatio: aspect };

  if (phase.kind === "uploading") {
    return (
      <div className={className}>
        <div className="relative overflow-hidden border border-line bg-surface-2" style={box}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={phase.preview} alt="" className={cn("h-full w-full opacity-70", contain ? "object-contain p-3" : "object-cover")} />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-[var(--bg)]/90 px-2 py-1.5 text-[12px]">
            <span className="truncate">
              Uploading {phase.name} <span className="text-3">({humanSize(phase.size)})</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 tabular">
              {Math.round(phase.fraction * 100)}%
              <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Cancel upload" className="p-0.5 hover:text-[var(--text)]">
                <X className="size-3.5" />
              </button>
            </span>
          </div>
          <ProgressRule fraction={phase.fraction} />
        </div>
      </div>
    );
  }

  if (value) {
    return (
      <div className={className}>
        <div className="group relative overflow-hidden border border-line bg-surface-2" style={box}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={alt?.value ?? ""} className={cn("h-full w-full", contain ? "object-contain p-3" : "object-cover")} />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-[var(--bg)]/92 px-2 py-1.5 text-[12.5px] opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
            <Dropzone accept={IMAGE_ACCEPT} onFiles={handle} disabled={disabled} label="Replace image" className="inline-flex flex-row gap-1 border-0 bg-transparent p-0 font-medium text-[var(--text)] hover:bg-transparent">
              <RefreshCw className="size-3.5" /> Replace
            </Dropzone>
            <button type="button" onClick={() => onChange("")} disabled={disabled} className="inline-flex items-center gap-1 text-2 hover:text-[var(--text)]">
              <Trash2 className="size-3.5" /> Remove
            </button>
          </div>
        </div>
        {phase.kind === "idle" && phase.info?.width ? (
          <p className="mt-1.5 text-[12px] text-3">
            Uploaded · {phase.info.width}×{phase.info.height}
            {phase.info.bytes ? ` · ${humanSize(phase.info.bytes)}` : ""}
          </p>
        ) : null}
        {alt ? <input value={alt.value} onChange={(e) => alt.onChange(e.target.value)} placeholder={alt.placeholder ?? "Describe the image (alt text)"} maxLength={300} className="mt-2 h-9 w-full border border-line bg-surface px-3 text-[13.5px] outline-none placeholder:text-[var(--text-3)] focus:border-ink-500" /> : null}
        {phase.kind === "error" ? <ErrorLine message={phase.message} onRetry={phase.file ? () => handle([phase.file!]) : undefined} /> : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <Dropzone accept={IMAGE_ACCEPT} onFiles={handle} disabled={disabled} label={label} className="@container p-3" style={{ ...box, maxHeight: 240 }}>
        <ImagePlus className="size-5 text-3" />
        <span className="font-medium text-[var(--text)]">{label}</span>
        <span className="text-[12px] leading-snug text-3">
          Drop, paste or <span className="underline underline-offset-2">browse</span>
          <span className="hidden @[14rem]:inline">
            <br />
            {hint ?? HINTS[variant] ?? "JPEG, PNG or WebP"}
          </span>
          <span className="hidden @[22rem]:inline"> · big photos are shrunk before upload</span>
        </span>
      </Dropzone>
      {phase.kind === "error" ? <ErrorLine message={phase.message} onRetry={phase.file ? () => handle([phase.file!]) : undefined} /> : null}
    </div>
  );
}

export function ErrorLine({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 border-l-2 border-[var(--text)] pl-2 text-[13px]" role="alert">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="font-medium underline underline-offset-4">
          Try again
        </button>
      ) : null}
    </p>
  );
}
