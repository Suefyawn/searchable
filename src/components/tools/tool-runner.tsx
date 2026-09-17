"use client";

import { RotateCcw, Share2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";
import { Field as FieldWrap, Input, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import { loadTool } from "@/tools/load";
import { defaultInput as defaults, type Field, type ToolDefinition, type ToolInput, type ToolResult } from "@/tools/types";

function fromParams(fields: Field[], params: URLSearchParams): ToolInput {
  const out: ToolInput = {};
  for (const f of fields) {
    const v = params.get(f.key);
    if (v === null) continue;
    if (f.type === "number") {
      const n = Number(v);
      if (Number.isFinite(n)) out[f.key] = n;
    } else if (f.type === "select") {
      if (f.options.some((o) => o.value === v)) out[f.key] = v;
    } else out[f.key] = v === "1" || v === "true";
  }
  return out;
}

/**
 * Renders any ToolDefinition: form from `fields`, live `compute`, results, warnings.
 * Runs entirely in the browser, nothing personal is sent to the server. The form and the server-computed
 * `initial` result paint at once; the calculator's own module arrives right after and takes over compute.
 */
export function ToolRunner({ slug, fields, live = {}, initial }: { slug: string; fields: Field[]; live?: ToolInput; initial: ToolResult }) {
  const [tool, setTool] = React.useState<ToolDefinition | null>(null);
  const pathname = usePathname();
  const params = useSearchParams();
  const [input, setInput] = React.useState<ToolInput>(() => ({ ...defaults(fields), ...live, ...fromParams(fields, params) }));
  const [copied, setCopied] = React.useState(false);
  const logged = React.useRef(false);

  React.useEffect(() => {
    let on = true;
    void loadTool(slug).then((t) => on && t && setTool(t));
    return () => {
      on = false;
    };
  }, [slug]);

  const result: ToolResult | null = React.useMemo(() => {
    if (!tool) return initial;
    try {
      return tool.compute(input);
    } catch {
      return null;
    }
  }, [tool, input, initial]);

  // Log one anonymous run per page view, after the user changes something.
  React.useEffect(() => {
    if (logged.current) return;
    const t = setTimeout(() => {
      logged.current = true;
      void fetch(`/api/tools/${slug}/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ inputs: input }) }).catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
  }, [slug, input]);

  function set(key: string, value: number | string | boolean) {
    setInput((cur) => ({ ...cur, [key]: value }));
  }

  async function share() {
    const qs = new URLSearchParams();
    for (const f of fields) qs.set(f.key, String(input[f.key]));
    const url = `${window.location.origin}${pathname}?${qs.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Inputs */}
      <form className="space-y-5 border border-line p-5 sm:p-6" onSubmit={(e) => e.preventDefault()}>
        {fields.map((f) => (
          <FieldInput key={f.key} field={f} value={input[f.key]} onChange={(v) => set(f.key, v)} />
        ))}
        <div className="flex items-center justify-between pt-1">
          <button type="button" onClick={() => setInput({ ...defaults(fields), ...live })} className="inline-flex items-center gap-1.5 text-sm text-2 hover:text-[var(--text)]">
            <RotateCcw className="size-3.5" /> Reset
          </button>
          <button type="button" onClick={share} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 dark:text-brand-300">
            <Share2 className="size-3.5" /> {copied ? "Link copied" : "Share this result"}
          </button>
        </div>
      </form>

      {/* Results */}
      <div className="space-y-4">
        {result ? (
          <>
            <div className="border-y-2 border-[var(--rule)] py-6">
              <p className="eyebrow">{result.headline.label}</p>
              <p className="mt-2 font-display text-5xl tabular tracking-tight sm:text-6xl">{result.headline.value}</p>
              {result.summary ? <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-2">{result.summary}</p> : null}
            </div>
            {result.sections.map((s, i) => (
              <div key={i} className="border-t border-line pt-3">
                {s.title ? <p className="eyebrow mb-1">{s.title}</p> : null}
                <dl className="divide-y divide-[var(--border)]">
                  {s.lines.map((l, j) => (
                    <div key={j} className={cn("flex items-baseline justify-between gap-4 py-2", l.primary ? "font-semibold" : "", l.muted ? "text-sm text-3" : "")}>
                      <dt className={cn("min-w-0", l.primary ? "" : "text-2")}>{l.label}</dt>
                      <dd className="shrink-0 tabular text-right">{l.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            {result.warnings?.length ? (
              <ul className="space-y-2 text-sm text-2">
                {result.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 border-l-2 border-amber-400 pl-3 py-1">
                    <span aria-hidden>⚠</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <div className="surface p-6 text-2">Enter values to see the result.</div>
        )}
      </div>
    </div>
  );
}

function FieldInput({ field: f, value, onChange }: { field: Field; value: number | string | boolean; onChange: (v: number | string | boolean) => void }) {
  const id = `f-${f.key}`;
  if (f.type === "boolean") {
    return (
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
        <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-4 accent-brand-700" />
        <span>
          <span className="block text-sm font-medium">{f.label}</span>
          {f.help ? <span className="block text-[13px] text-3">{f.help}</span> : null}
        </span>
      </label>
    );
  }
  if (f.type === "select") {
    return (
      <FieldWrap label={f.label} help={f.help} htmlFor={id}>
        <Select id={id} value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </FieldWrap>
    );
  }
  return (
    <FieldWrap label={f.label} help={f.help} htmlFor={id}>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value as number) ? String(value) : ""}
          min={f.min}
          max={f.max}
          step={f.step ?? "any"}
          placeholder={f.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className={cn("tabular", f.unit ? "pr-16" : "")}
        />
        {f.unit ? <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-3">{f.unit}</span> : null}
      </div>
    </FieldWrap>
  );
}
