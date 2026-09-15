"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The shared drop target: click, keyboard, drag, and paste. Children draw the idle state. Keeps the native
 * input in the tree so screen readers and mobile file pickers work; hides it visually.
 */
export function Dropzone({ accept, multiple, disabled, onFiles, className, style, children, label = "Upload" }: { accept: string; multiple?: boolean; disabled?: boolean; onFiles: (files: File[]) => void; className?: string; style?: React.CSSProperties; children: React.ReactNode; label?: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const depth = React.useRef(0);

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData?.files ?? []);
        if (files.length && !disabled) {
          e.preventDefault();
          onFiles(multiple ? files : files.slice(0, 1));
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        if (!disabled) setOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = disabled ? "none" : "copy";
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      data-over={over || undefined}
      className={cn(
        "relative flex cursor-pointer select-none flex-col items-center justify-center gap-1.5 border border-dashed border-ink-300 bg-surface text-center text-[13.5px] text-2 outline-none transition-colors",
        "hover:border-ink-500 hover:bg-surface-2 focus-visible:border-ink-900 focus-visible:ring-2 focus-visible:ring-ink-900/15",
        over && "border-ink-900 bg-surface-2",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      style={style}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}

/** Thin progress rule at the bottom of a tile. */
export function ProgressRule({ fraction, className }: { fraction: number; className?: string }) {
  return (
    <div className={cn("absolute inset-x-0 bottom-0 h-1 bg-ink-200", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fraction * 100)}>
      <div className="h-full bg-ink-900 transition-[width] duration-150" style={{ width: `${Math.max(3, Math.round(fraction * 100))}%` }} />
    </div>
  );
}
