import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

/* ───────────── Button ───────────── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "dark";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-[0_1px_0_oklch(1_0_0/0.15)_inset,0_6px_16px_-6px_oklch(0.54_0.155_158/0.6)]",
  dark: "bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100",
  secondary: "bg-surface-2 text-[var(--text)] hover:bg-surface-3",
  outline: "ring-line bg-surface text-[var(--text)] hover:bg-surface-2",
  ghost: "text-[var(--text-2)] hover:bg-surface-2 hover:text-[var(--text)]",
  danger: "bg-rose-500 text-white hover:bg-rose-700",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-13 px-7 text-base gap-2",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none",
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}

export function Button({ variant = "primary", size = "md", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, href, ...props }: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link href={href} className={buttonClass(variant, size, className)} {...props} />;
}

/* ───────────── Inputs ───────────── */
export const inputClass =
  "w-full h-11 rounded-xl bg-surface-2 px-4 text-[15px] text-[var(--text)] placeholder:text-[var(--text-3)] ring-line focus:bg-surface focus:ring-2 focus:ring-brand-500/40 outline-none transition";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "h-auto min-h-32 py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputClass,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222.2%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_0.9rem_center] pr-10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-semibold text-[var(--text)] mb-1.5", className)} {...props} />;
}

export function Field({ label, help, htmlFor, children, className }: { label: string; help?: string; htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {help ? <p className="mt-1.5 text-[13px] leading-snug text-3">{help}</p> : null}
    </div>
  );
}

/* ───────────── Card ───────────── */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("surface", className)} {...props} />;
}

/* ───────────── Badge ───────────── */
type BadgeTone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger" | "sky" | "violet" | "rose";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-[var(--text-2)]",
  brand: "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200",
  accent: "bg-accent-100 text-accent-700 dark:bg-accent-700/30 dark:text-accent-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-700/30 dark:text-rose-100",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-700/30 dark:text-sky-100",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-700/30 dark:text-violet-100",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-700/30 dark:text-rose-100",
};
export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]", badgeTones[tone], className)} {...props} />;
}

/* ───────────── Section header ───────────── */
export function SectionHeader({ eyebrow, title, description, href, hrefLabel = "View all", as: Tag = "h2", className }: { eyebrow?: string; title: string; description?: string; href?: string; hrefLabel?: string; as?: "h1" | "h2" | "h3"; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3 mb-7", className)}>
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <Tag className={cn("font-display font-semibold tracking-tight", Tag === "h1" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl")}>{title}</Tag>
        {description ? <p className="mt-2 text-2 text-[17px]">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="group inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-surface-3 transition-colors">
          {hrefLabel} <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      ) : null}
    </div>
  );
}

/* ───────────── Empty state ───────────── */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="surface-2 px-6 py-16 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {description ? <p className="mt-1.5 text-2 max-w-md mx-auto">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ───────────── JSON-LD ───────────── */
export function JsonLd({ data }: { data: object | null | (object | null)[] }) {
  const list = (Array.isArray(data) ? data : [data]).filter(Boolean);
  if (!list.length) return null;
  return (
    <>
      {list.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }} />
      ))}
    </>
  );
}

/* ───────────── Breadcrumbs ───────────── */
export function Breadcrumbs({ items, className }: { items: { name: string; path: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm text-3", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-[var(--text)]">
            Home
          </Link>
        </li>
        {items.map((it, i) => (
          <li key={it.path} className="flex items-center gap-1.5">
            <span aria-hidden className="text-ink-300">/</span>
            {i === items.length - 1 ? (
              <span className="text-2" aria-current="page">
                {it.name}
              </span>
            ) : (
              <Link href={it.path} className="hover:text-[var(--text)]">
                {it.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ───────────── Alert ───────────── */
export function Alert({ tone = "neutral", title, children, className }: { tone?: "neutral" | "warning" | "info" | "success" | "danger"; title?: string; children: React.ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-surface-2",
    info: "bg-brand-50 dark:bg-brand-950/40",
    warning: "bg-amber-50 dark:bg-amber-950/30",
    success: "bg-emerald-50 dark:bg-emerald-950/30",
    danger: "bg-rose-100/60 dark:bg-rose-700/20",
  };
  return (
    <div className={cn("rounded-xl px-4 py-3 text-[15px] leading-relaxed", tones[tone], className)}>
      {title ? <p className="font-semibold mb-0.5">{title}</p> : null}
      <div className="text-2">{children}</div>
    </div>
  );
}

/* ───────────── Pill chip (filters, tags) ───────────── */
export function Chip({ active, className, href, children, ...props }: { active?: boolean; href: string; children: React.ReactNode; className?: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "bg-surface-2 text-2 hover:bg-surface-3 hover:text-[var(--text)]",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
