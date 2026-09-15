"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/utils";

type Suggestion = { entityType: string; url: string; title: string; category: string | null; city: string | null };

const TYPE_LABEL: Record<string, string> = { tool: "Tool", guide: "Guide", news: "News", business: "Business", location: "Place", entity: "Topic", data_series: "Data", comparison: "Compare" };

export function SearchBox({
  size = "md",
  autoFocus,
  defaultValue = "",
  placeholder = "Search Pakistan — tax, bills, businesses, guides…",
  className,
}: {
  size?: "md" | "lg";
  autoFocus?: boolean;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(defaultValue);
  const [items, setItems] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const q = value.trim();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setItems([]);
        return;
      }
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        if (res.ok) {
          const data = (await res.json()) as Suggestion[];
          setItems(data);
          setOpen(true);
          setActive(-1);
        }
      } catch {
        /* aborted */
      }
    }, 120);
    return () => clearTimeout(t);
  }, [value]);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function submit(q = value) {
    const query = q.trim();
    if (!query) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) {
      if (e.key === "Enter") submit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0) router.push(items[active].url);
      else submit();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const big = size === "lg";

  return (
    <div ref={boxRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-surface transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15",
          big ? "h-14 sm:h-16 pl-5 pr-2 shadow-pop border-line" : "h-10 pl-3.5 pr-1.5 border-line",
        )}
      >
        <Search className={cn("shrink-0 text-3", big ? "size-5 sm:size-6" : "size-4")} aria-hidden />
        <input
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Search"
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={open}
          aria-controls="search-suggestions"
          className={cn("min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--text-3)] [&::-webkit-search-cancel-button]:hidden", big ? "text-lg sm:text-xl" : "text-[15px]")}
        />
        {value ? (
          <button type="button" onClick={() => setValue("")} aria-label="Clear" className="p-1.5 rounded-md text-3 hover:text-[var(--text)] hover:bg-surface-2">
            <X className="size-4" />
          </button>
        ) : null}
        <button
          type="submit"
          className={cn("rounded-lg bg-brand-700 font-medium text-white hover:bg-brand-800 transition-colors", big ? "h-10 sm:h-12 px-4 sm:px-5 text-[15px] sm:text-base" : "h-7 px-3 text-sm")}
        >
          Search
        </button>
      </form>

      {open && items.length > 0 ? (
        <ul id="search-suggestions" role="listbox" className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-pop">
          {items.map((it, i) => (
            <li key={it.url} role="option" aria-selected={i === active}>
              <a
                href={it.url}
                onMouseEnter={() => setActive(i)}
                className={cn("flex items-center gap-3 px-4 py-2.5 text-[15px]", i === active ? "bg-surface-2" : "")}
              >
                <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">{TYPE_LABEL[it.entityType] ?? it.entityType}</span>
                <span className="truncate">{it.title}</span>
                {it.city ? <span className="ml-auto shrink-0 text-xs text-3">{it.city}</span> : it.category ? <span className="ml-auto shrink-0 text-xs text-3">{it.category}</span> : null}
              </a>
            </li>
          ))}
          <li className="border-t border-line">
            <button type="button" onClick={() => submit()} className="w-full px-4 py-2.5 text-left text-sm text-2 hover:bg-surface-2">
              Search everything for “{value.trim()}” →
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
