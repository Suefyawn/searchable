"use client";

import { Clock, Search, TrendingUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Site search box with instant suggestions.
 *
 * Suggestions come from two places: a small evergreen index (/suggest-index.json, fetched once and matched
 * in the browser, so typing costs nothing on the server) and, for businesses and news, a CDN-cached
 * /api/suggest call that only fires when the local index has too little to show.
 */
type Suggestion = { entityType: string; url: string; title: string; meta?: string | null; sub?: string | null; score: number };
type IndexEntry = { t: string; u: string; k: string; y: string; c?: string; m?: string };
type SuggestIndex = { entries: IndexEntry[]; popular: string[] };

const TYPE_LABEL: Record<string, string> = { tool: "Calculator", guide: "Guide", news: "News", business: "Business", location: "Place", entity: "Topic", data_series: "Data", comparison: "Compare" };
const TYPE_ORDER = ["tool", "data_series", "guide", "comparison", "business", "location", "entity", "news"];
const RECENT_KEY = "sp:recent-searches";

let indexPromise: Promise<SuggestIndex> | null = null;
function loadIndex(): Promise<SuggestIndex> {
  if (!indexPromise) {
    indexPromise = fetch("/suggest-index.json")
      .then((r) => (r.ok ? (r.json() as Promise<SuggestIndex>) : { entries: [], popular: [] }))
      .catch(() => {
        indexPromise = null;
        return { entries: [], popular: [] };
      });
  }
  return indexPromise;
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 5) : [];
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  try {
    const next = [q, ...readRecent().filter((x) => x !== q)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

/** Ranks index entries for a query: title prefix, then word prefix, then substring, then keyword hit. */
function matchLocal(entries: IndexEntry[], q: string, limit = 8): Suggestion[] {
  const scored: { e: IndexEntry; s: number }[] = [];
  for (const e of entries) {
    const t = e.t.toLowerCase();
    let s = 0;
    if (t.startsWith(q)) s = 4;
    else if (t.includes(" " + q)) s = 3;
    else if (t.includes(q)) s = 2;
    else if (e.k.includes(q)) s = 1;
    if (s) scored.push({ e, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map(({ e, s }) => ({ entityType: e.y, url: e.u, title: e.t, meta: e.m ?? null, sub: e.c ?? null, score: s }));
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-[var(--text)]">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function beacon(q: string, url: string) {
  try {
    navigator.sendBeacon?.("/api/track", new Blob([JSON.stringify({ name: "search_click", props: { q, url } })], { type: "application/json" }));
  } catch {
    /* ignore */
  }
}

export function SearchBox({
  size = "md",
  autoFocus,
  defaultValue = "",
  placeholder = "Search…",
  hotkey = false,
  className,
}: {
  size?: "md" | "lg";
  autoFocus?: boolean;
  defaultValue?: string;
  placeholder?: string;
  /** Pressing "/" anywhere on the page focuses this box. Use on the header instance only. */
  hotkey?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(defaultValue);
  const [items, setItems] = React.useState<Suggestion[]>([]);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [popular, setPopular] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const q = value.trim().toLowerCase();

  // Suggestions: local index first, network only when the index is thin.
  React.useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setItems([]);
        return;
      }
      const idx = await loadIndex();
      const local = matchLocal(idx.entries, q);
      if (cancelled) return;
      setItems(local);
      setActive(-1);
      if (local.length >= 6 || q.length < 3) return;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { entityType: string; url: string; title: string; category: string | null; city: string | null }[];
        const seen = new Set(local.map((l) => l.url));
        const extra = data.filter((d) => !seen.has(d.url)).map((d) => ({ entityType: d.entityType, url: d.url, title: d.title, sub: d.city ?? d.category ?? null, score: d.title.toLowerCase().startsWith(q) ? 3 : 1 }));
        setItems([...local, ...extra].slice(0, 10));
      } catch {
        /* aborted */
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  React.useEffect(() => {
    if (!hotkey) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hotkey]);

  function onFocus() {
    setFocused(true);
    setOpen(true);
    setRecent(readRecent());
    void loadIndex().then((idx) => setPopular(idx.popular.slice(0, 6)));
  }

  function submit(next = value) {
    const query = next.trim();
    if (!query) return;
    pushRecent(query.toLowerCase());
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function choose(it: Suggestion) {
    pushRecent(q);
    beacon(q, it.url);
    setOpen(false);
    router.push(it.url);
  }

  // What the dropdown shows: grouped suggestions when typing, recent + popular when empty.
  const groups = React.useMemo(() => {
    const map = new Map<string, Suggestion[]>();
    for (const it of items) {
      if (!map.has(it.entityType)) map.set(it.entityType, []);
      map.get(it.entityType)!.push(it);
    }
    // Groups ordered by their strongest match, so "gold" leads with the gold rate rather than a calculator that mentions it.
    return TYPE_ORDER.filter((t) => map.has(t))
      .map((t) => ({ type: t, items: map.get(t)!, best: Math.max(...map.get(t)!.map((i) => i.score)) }))
      .sort((a, b) => b.best - a.best || TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type));
  }, [items]);
  const flat = groups.flatMap((g) => g.items);
  const idle = q.length < 2;
  const idleList = idle ? [...recent.map((r) => ({ kind: "recent" as const, q: r })), ...popular.filter((p) => !recent.includes(p)).map((p) => ({ kind: "popular" as const, q: p }))] : [];
  const listLength = idle ? idleList.length : flat.length + 1;
  const showList = open && listLength > 0 && (!idle || idleList.length > 0);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showList) {
      if (e.key === "Enter") submit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % listLength);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + listLength) % listLength);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (idle) {
        if (active >= 0) submit(idleList[active].q);
        return;
      }
      if (active >= 0 && active < flat.length) choose(flat[active]);
      else submit();
    }
  }

  const big = size === "lg";
  let cursor = 0;

  return (
    <div ref={boxRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          "flex items-center gap-2 border bg-surface transition-colors focus-within:border-ink-600",
          big ? "h-14 border-ink-300 pl-4 pr-1.5" : "h-9 border-line pl-3 pr-1",
        )}
      >
        <Search className={cn("shrink-0 text-3", big ? "size-5" : "size-4")} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={onFocus}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Search"
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={showList}
          aria-controls="search-suggestions"
          aria-activedescendant={active >= 0 ? `sugg-${active}` : undefined}
          className={cn("min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--text-3)] [&::-webkit-search-cancel-button]:hidden", big ? "text-lg" : "text-sm")}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              inputRef.current?.focus();
            }}
            aria-label="Clear"
            className="p-1 text-3 hover:text-[var(--text)]"
          >
            <X className="size-4" />
          </button>
        ) : hotkey && !focused ? (
          <kbd aria-hidden className="hidden h-5 min-w-5 items-center justify-center border border-line px-1 font-sans text-[11px] text-3 sm:inline-flex">/</kbd>
        ) : null}
        <button type="submit" className={cn("bg-ink-900 font-medium text-white hover:bg-ink-800", big ? "h-11 px-5 text-[15px]" : "h-7 px-3 text-[13px]")}>
          Search
        </button>
      </form>

      {showList ? (
        <div id="search-suggestions" role="listbox" className={cn("absolute z-40 mt-1 border border-line bg-surface shadow-pop", big ? "w-full" : "right-0 w-[26rem] max-w-[calc(100vw-2rem)]")}>
          {idle ? (
            <ul className="py-1.5">
              {idleList.map((it, i) => (
                <li key={it.kind + it.q} id={`sugg-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => submit(it.q)}
                    className={cn("flex w-full items-center gap-3 px-4 py-2 text-left text-[15px]", i === active ? "bg-surface-2" : "")}
                  >
                    {it.kind === "recent" ? <Clock className="size-3.5 shrink-0 text-3" aria-hidden /> : <TrendingUp className="size-3.5 shrink-0 text-3" aria-hidden />}
                    <span className="truncate">{it.q}</span>
                    <span className="ml-auto shrink-0 text-[11px] uppercase tracking-wider text-3">{it.kind === "recent" ? "Recent" : "Popular"}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              {groups.map((g) => (
                <div key={g.type} className="border-b border-line py-1.5 last:border-b-0">
                  <p className="px-4 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-3">{TYPE_LABEL[g.type] ?? g.type}</p>
                  <ul>
                    {g.items.map((it) => {
                      const i = cursor++;
                      return (
                        <li key={it.url} id={`sugg-${i}`} role="option" aria-selected={i === active}>
                          <a
                            href={it.url}
                            onMouseEnter={() => setActive(i)}
                            onClick={(e) => {
                              e.preventDefault();
                              choose(it);
                            }}
                            className={cn("flex items-baseline gap-3 px-4 py-1.5 text-[15px]", i === active ? "bg-surface-2" : "")}
                          >
                            <span className="min-w-0 truncate">
                              <Highlight text={it.title} q={q} />
                            </span>
                            {it.meta ? (
                              <span className="ml-auto shrink-0 font-medium tabular text-[var(--text)]">{it.meta}</span>
                            ) : it.sub ? (
                              <span className="ml-auto shrink-0 text-xs text-3">{it.sub}</span>
                            ) : null}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="border-t border-line">
                <button
                  type="button"
                  id={`sugg-${flat.length}`}
                  role="option"
                  aria-selected={active === flat.length}
                  onMouseEnter={() => setActive(flat.length)}
                  onClick={() => submit()}
                  className={cn("flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-2", active === flat.length ? "bg-surface-2" : "hover:bg-surface-2")}
                >
                  <Search className="size-3.5" aria-hidden />
                  {flat.length ? "All results for" : "Search for"} “{value.trim()}” →
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
