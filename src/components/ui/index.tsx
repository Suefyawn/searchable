import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

/* ───────────── Button ───────────── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "dark";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-800 text-white hover:bg-brand-900 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100",
  dark: "bg-ink-900 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100",
  secondary: "bg-surface-2 text-[var(--text)] hover:bg-surface-3",
  outline: "border border-line bg-surface text-[var(--text)] hover:bg-surface-2",
  ghost: "text-[var(--text-2)] hover:bg-surface-2 hover:text-[var(--text)]",
  danger: "bg-rose-700 text-white hover:bg-rose-500",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none select-none",
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
  "w-full h-10 rounded-md border border-line bg-surface px-3 text-[15px] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-ink-500 outline-none transition";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "h-auto min-h-32 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputClass,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23777%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_0.6rem_center] pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-[13px] font-semibold text-[var(--text)] mb-1.5", className)} {...props} />;
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
  neutral: "text-[var(--text-2)] border-line",
  brand: "text-brand-700 border-brand-200 dark:text-brand-300 dark:border-brand-800",
  accent: "text-accent-700 border-accent-300",
  success: "text-emerald-700 border-emerald-200 dark:text-emerald-300 dark:border-emerald-800",
  warning: "text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-800",
  danger: "text-rose-700 border-rose-100 dark:text-rose-500",
  sky: "text-sky-700 border-sky-100 dark:text-sky-500",
  violet: "text-violet-700 border-violet-100 dark:text-violet-500",
  rose: "text-rose-700 border-rose-100 dark:text-rose-500",
};
export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cn("inline-flex items-center rounded-sm border px-1.5 py-0.5 font-sans text-[10.5px] font-bold uppercase tracking-[0.1em]", badgeTones[tone], className)} {...props} />;
}

/* ───────────── Section header: rule + small-caps label + serif title ───────────── */
export function SectionHeader({ eyebrow, title, description, href, hrefLabel = "See all", as: Tag = "h2", className }: { eyebrow?: string; title: string; description?: string; href?: string; hrefLabel?: string; as?: "h1" | "h2" | "h3"; className?: string }) {
  const isPage = Tag === "h1";
  return (
    <div className={cn(isPage ? "mb-8" : "rule mb-6 pt-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="max-w-2xl">
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
          <Tag className={cn("font-serif", isPage ? "text-4xl font-medium sm:text-5xl" : "text-2xl font-medium sm:text-[1.75rem]")}>{title}</Tag>
          {description ? <p className={cn("mt-2 text-2", isPage ? "text-lg" : "text-[15px]")}>{description}</p> : null}
        </div>
        {href ? (
          <Link href={href} className="text-sm font-medium text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
            {hrefLabel} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/* ───────────── Empty state ───────────── */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="hairline py-14 text-center">
      <p className="font-serif text-2xl">{title}</p>
      {description ? <p className="mt-1.5 max-w-md mx-auto text-2">{description}</p> : null}
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
    <nav aria-label="Breadcrumb" className={cn("text-[13px] text-3", className)}>
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
    neutral: "border-line bg-surface-2",
    info: "border-brand-200 bg-brand-50 dark:bg-brand-950/40 dark:border-brand-800",
    warning: "border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800",
    success: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800",
    danger: "border-rose-100 bg-rose-100/40 dark:bg-rose-700/20",
  };
  return (
    <div className={cn("rounded-md border px-4 py-3 text-[15px] leading-relaxed", tones[tone], className)}>
      {title ? <p className="font-semibold mb-0.5">{title}</p> : null}
      <div className="text-2">{children}</div>
    </div>
  );
}

/* ───────────── Chip (filters, tags): text with a hairline underline when active ───────────── */
export function Chip({ active, className, href, children, ...props }: { active?: boolean; href: string; children: React.ReactNode; className?: string } & Omit<React.ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2 hover:text-[var(--text)]",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
