"use client";

import { FileText, RefreshCw, Trash2, Upload, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Dropzone, ProgressRule } from "./dropzone";
import { ErrorLine } from "./image-upload";
import { humanSize, uploadFile, validateFile } from "./upload-client";

type Phase = { kind: "idle" } | { kind: "uploading"; name: string; size: number; fraction: number } | { kind: "error"; message: string; file?: File };

/** A PDF (CV, certificate): drop or browse, progress, replace, remove. Shows the stored file by name. */
export function DocumentUpload({ value, onChange, label = "Upload a PDF", hint = "PDF up to 5 MB", fileLabel = "Uploaded PDF", className, disabled }: { value?: string; onChange: (url: string) => void; label?: string; hint?: string; /** Shown for a stored file whose original name we no longer know. */ fileLabel?: string; className?: string; disabled?: boolean }) {
  const [phase, setPhase] = React.useState<Phase>({ kind: "idle" });
  const [fileName, setFileName] = React.useState<{ url: string; name: string; size: number } | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  async function handle(files: File[]) {
    const file = files[0];
    if (!file || disabled) return;
    const problem = validateFile(file, "pdf");
    if (problem) {
      setPhase({ kind: "error", message: problem });
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase({ kind: "uploading", name: file.name, size: file.size, fraction: 0 });
    try {
      const res = await uploadFile(file, { variant: "cv", signal: ac.signal, onProgress: (f) => setPhase((p) => (p.kind === "uploading" ? { ...p, fraction: f } : p)) });
      setFileName({ url: res.url, name: file.name, size: file.size });
      onChange(res.url);
      setPhase({ kind: "idle" });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") setPhase({ kind: "idle" });
      else setPhase({ kind: "error", message: e instanceof Error ? e.message : "Upload failed", file });
    }
  }

  if (phase.kind === "uploading") {
    return (
      <div className={className}>
        <div className="relative flex items-center gap-3 overflow-hidden border border-line px-3 py-2.5 text-[13.5px]">
          <FileText className="size-5 shrink-0 text-3" />
          <span className="min-w-0 flex-1 truncate">
            {phase.name} <span className="text-3">({humanSize(phase.size)})</span>
          </span>
          <span className="tabular text-2">{Math.round(phase.fraction * 100)}%</span>
          <button type="button" onClick={() => abortRef.current?.abort()} aria-label="Cancel upload" className="p-0.5 text-2 hover:text-[var(--text)]">
            <X className="size-4" />
          </button>
          <ProgressRule fraction={phase.fraction} />
        </div>
      </div>
    );
  }

  if (value) {
    const known = fileName?.url === value ? fileName : null;
    return (
      <div className={className}>
        <div className="flex items-center gap-3 border border-line px-3 py-2.5 text-[13.5px]">
          <FileText className="size-5 shrink-0 text-3" />
          <a href={value} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate font-medium underline-offset-4 hover:underline">
            {known ? known.name : fileLabel}
            {known ? <span className="font-normal text-3"> ({humanSize(known.size)})</span> : null}
          </a>
          <Dropzone accept="application/pdf,.pdf" onFiles={handle} disabled={disabled} label="Replace PDF" className="inline-flex flex-row gap-1 border-0 bg-transparent p-0 text-2 hover:bg-transparent hover:text-[var(--text)]">
            <RefreshCw className="size-3.5" /> Replace
          </Dropzone>
          <button type="button" onClick={() => onChange("")} disabled={disabled} className="inline-flex items-center gap-1 text-2 hover:text-[var(--text)]">
            <Trash2 className="size-3.5" /> Remove
          </button>
        </div>
        {phase.kind === "error" ? <ErrorLine message={phase.message} onRetry={phase.file ? () => handle([phase.file!]) : undefined} /> : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <Dropzone accept="application/pdf,.pdf" onFiles={handle} disabled={disabled} label={label} className="px-4 py-5">
        <Upload className="size-5 text-3" />
        <span className="font-medium text-[var(--text)]">{label}</span>
        <span className="text-[12px] text-3">
          Drop or <span className="underline underline-offset-2">browse</span> · {hint}
        </span>
      </Dropzone>
      {phase.kind === "error" ? <ErrorLine message={phase.message} onRetry={phase.file ? () => handle([phase.file!]) : undefined} /> : null}
    </div>
  );
}

/** Pick a local file without uploading it (CSV import): the parent reads it. */
export function LocalFilePicker({ accept, label, hint, onFile, className, disabled }: { accept: string; label: string; hint?: string; onFile: (file: File) => void; className?: string; disabled?: boolean }) {
  const [name, setName] = React.useState<string | null>(null);
  return (
    <Dropzone
      accept={accept}
      disabled={disabled}
      label={label}
      onFiles={(files) => {
        const f = files[0];
        if (!f) return;
        setName(`${f.name} (${humanSize(f.size)})`);
        onFile(f);
      }}
      className={cn("px-4 py-5", className)}
    >
      <Upload className="size-5 text-3" />
      <span className="font-medium text-[var(--text)]">{name ?? label}</span>
      <span className="text-[12px] text-3">
        Drop or <span className="underline underline-offset-2">browse</span>
        {hint ? ` · ${hint}` : ""}
      </span>
    </Dropzone>
  );
}
