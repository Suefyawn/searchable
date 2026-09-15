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
          "flex items-center gap-2 border bg-surface transition-colors focus-within:border-ink-600 dark:focus-within:border-ink-300",
          big ? "h-14 border-ink-300 pl-4 pr-1.5 dark:border-ink-600" : "h-9 border-line pl-3 pr-1",
        )}
      >
        <Search className={cn("shrink-0 text-3", big ? "size-5" : "size-4")} aria-hidden />
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
          className={cn("min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--text-3)] [&::-webkit-search-cancel-button]:hidden", big ? "text-lg" : "text-sm")}
        />
        {value ? (
          <button type="button" onClick={() => setValue("")} aria-label="Clear" className="p-1 text-3 hover:text-[var(--text)]">
            <X className="size-4" />
          </button>
        ) : null}
        <button type="submit" className={cn("bg-ink-900 font-medium text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100", big ? "h-11 px-5 text-[15px]" : "h-7 px-3 text-[13px]")}>
          Search
        </button>
      </form>

      {open && items.length > 0 ? (
        <ul id="search-suggestions" role="listbox" className="absolute z-40 mt-1 w-full border border-line bg-surface shadow-pop">
          {items.map((it, i) => (
            <li key={it.url} role="option" aria-selected={i === active}>
              <a href={it.url} onMouseEnter={() => setActive(i)} className={cn("flex items-center gap-3 px-4 py-2.5 text-[15px]", i === active ? "bg-surface-2" : "")}>
                <span className="w-16 shrink-0 text-[10.5px] font-bold uppercase tracking-[0.1em] text-3">{TYPE_LABEL[it.entityType] ?? it.entityType}</span>
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
