import Link from "next/link";
import * as React from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

/*
 * Admin building blocks. Every admin page is: <AdminPage title actions> <FilterTabs/> <Table/> </AdminPage>.
 * Monochrome, hairlines, no cards inside cards. Keep these dumb: server components, no state.
 */

export function AdminPage({ title, description, actions, children, wide }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn(!wide && "max-w-6xl")}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-2 border-[var(--rule)] pb-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight">{title}</h1>
          {description ? <p className="mt-1 max-w-3xl text-[15px] text-2">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Underline tabs with optional counts. `href` builders keep the other params. */
export function FilterTabs({ items, className }: { items: { href: string; label: string; count?: number | null; active: boolean }[]; className?: string }) {
  return (
    <nav className={cn("-mb-px flex gap-5 overflow-x-auto no-scrollbar border-b border-line", className)} aria-label="Filter">
      {items.map((t) => (
        <Link key={t.href + t.label} href={t.href} className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-[14.5px] font-medium capitalize", t.active ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-2 hover:text-[var(--text)]")}>
          {t.label}
          {typeof t.count === "number" ? <span className="text-[12px] font-normal tabular text-3">{t.count.toLocaleString()}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** Row under the tabs: search box on the right, extra filters on the left. */
export function Toolbar({ children, search }: { children?: React.ReactNode; search?: { name?: string; placeholder: string; defaultValue?: string; hidden?: Record<string, string | undefined> } }) {
  return (
    <div className="mb-4 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
      {children}
      {search ? (
        <form className="ml-auto flex items-center gap-2">
          {Object.entries(search.hidden ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <input name={search.name ?? "q"} defaultValue={search.defaultValue} placeholder={search.placeholder} aria-label={search.placeholder} className="h-9 w-56 border border-line bg-surface px-3 text-sm outline-none placeholder:text-[var(--text-3)] focus:border-ink-500" />
        </form>
      ) : null}
    </div>
  );
}

/** Small link-style filter (City: Anywhere · Lahore …). */
export function SubFilter({ label, items }: { label: string; items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-3">{label}</span>
      {items.map((i) => (
        <Link key={i.href + i.label} href={i.href} className={cn("px-1.5 py-0.5 capitalize", i.active ? "font-semibold underline underline-offset-4" : "text-2 hover:text-[var(--text)]")}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto border-y border-line", className)}>
      <table className="w-full text-[14.5px]">{children}</table>
    </div>
  );
}
export function THead({ cols }: { cols: (string | { label: string; align?: "right"; className?: string })[] }) {
  return (
    <thead className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-3">
      <tr className="border-b border-line">
        {cols.map((c, i) => {
          const col = typeof c === "string" ? { label: c } : c;
          return (
            <th key={i} className={cn("px-3 py-2 font-semibold first:pl-0 last:pr-0", col.align === "right" && "text-right", col.className)}>
              {col.label}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-[var(--border)]">{children}</tbody>;
}
export function Td({ children, align, className, muted }: { children?: React.ReactNode; align?: "right"; className?: string; muted?: boolean }) {
  return <td className={cn("px-3 py-2.5 align-top first:pl-0 last:pr-0", align === "right" && "text-right tabular", muted && "text-2", className)}>{children}</td>;
}
export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-[15px] text-2">
        {children}
      </td>
    </tr>
  );
}

/** List variant for rows that carry actions and a paragraph (reviews, messages, claims). */
export function Rows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-[var(--border)] border-y border-line">{children}</div>;
}
export function Row({ children, actions, className }: { children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start gap-x-6 gap-y-3 py-3.5", className)}>
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}
export function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="py-12 text-center text-[15px] text-2">
      <p>{children}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** Status pill with a fixed tone per status word, so every page reads the same. */
const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  published: "success",
  active: "success",
  approved: "success",
  paid: "success",
  sent: "success",
  replied: "success",
  verified: "success",
  draft: "neutral",
  scheduled: "warning",
  pending: "warning",
  new: "warning",
  review: "warning",
  hidden: "neutral",
  archived: "neutral",
  expired: "neutral",
  closed: "neutral",
  free: "neutral",
  rejected: "danger",
  cancelled: "danger",
  duplicate: "neutral",
  refunded: "neutral",
  unsubscribed: "neutral",
  bounced: "danger",
};
export function Status({ value, className }: { value: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[value] ?? "neutral"} className={className}>
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

/** KPI tile. `delta` is the change against the previous period, already formatted. */
export function Stat({ label, value, delta, hint, href }: { label: string; value: React.ReactNode; delta?: { text: string; up?: boolean | null }; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-3">{label}</p>
      <p className="mt-1.5 font-display text-[1.75rem] leading-none tabular">{value}</p>
      {delta || hint ? (
        <p className="mt-1.5 text-[12.5px] text-3">
          {delta ? <span className={cn("font-medium", delta.up === true && "text-[var(--text)]", delta.up === false && "text-2")}>{delta.text}</span> : null}
          {delta && hint ? " · " : null}
          {hint}
        </p>
      ) : null}
    </>
  );
  const cls = "block border-t-2 border-[var(--rule)] pt-3";
  return href ? (
    <Link href={href} className={cn(cls, "hover:bg-surface-2")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Section({ title, description, action, children, className }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b-2 border-[var(--rule)] pb-1.5">
        <div>
          <h2 className="eyebrow">{title}</h2>
          {description ? <p className="mt-0.5 text-[13px] text-3">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Definition list for a record's details. */
export function Details({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-[14.5px] sm:grid-cols-[max-content_1fr]">
      {items
        .filter((i) => i.value !== null && i.value !== undefined && i.value !== "")
        .map((i) => (
          <React.Fragment key={i.label}>
            <dt className="text-3">{i.label}</dt>
            <dd className="min-w-0 break-words">{i.value}</dd>
          </React.Fragment>
        ))}
    </dl>
  );
}

/** Tiny inline bar chart (last N days) drawn as SVG, no library. */
export function Bars({ values, height = 36, className, title }: { values: number[]; height?: number; className?: string; title?: string }) {
  const max = Math.max(1, ...values);
  const w = 6;
  const gap = 2;
  const width = values.length * (w + gap) - gap;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("block", className)} role="img" aria-label={title}>
      {values.map((v, i) => {
        const h = Math.max(1, Math.round((v / max) * (height - 2)));
        return <rect key={i} x={i * (w + gap)} y={height - h} width={w} height={h} className={i === values.length - 1 ? "fill-ink-900" : "fill-ink-300"} />;
      })}
    </svg>
  );
}

/** Pagination that keeps every other query param. */
export function Pager({ page, pageSize, total, href }: { page: number; pageSize: number; total: number; href: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} className="font-medium underline-offset-4 hover:underline">← Previous</Link> : <span />}
      <span className="text-3">
        Page {page} of {pages} · {total.toLocaleString()} total
      </span>
      {page < pages ? <Link href={href(page + 1)} className="font-medium underline-offset-4 hover:underline">Next →</Link> : <span />}
    </nav>
  );
}
