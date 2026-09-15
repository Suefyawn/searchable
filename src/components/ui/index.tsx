import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

/* ───────────── Button ───────────── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 shadow-sm",
  secondary: "bg-surface-2 text-[var(--text)] hover:bg-ink-200 dark:hover:bg-ink-700",
  outline: "border border-line bg-surface text-[var(--text)] hover:bg-surface-2",
  ghost: "text-[var(--text-2)] hover:bg-surface-2 hover:text-[var(--text)]",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-[15px] gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none select-none",
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link href={href} className={buttonClass(variant, size, className)} {...props} />;
}

/* ───────────── Inputs ───────────── */
export const inputClass =
  "w-full h-11 rounded-md border border-line bg-surface px-3.5 text-[15px] text-[var(--text)] placeholder:text-[var(--text-3)] focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "h-auto min-h-32 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23777%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_0.75rem_center] pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-[var(--text)] mb-1.5", className)} {...props} />;
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
type BadgeTone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-[var(--text-2)]",
  brand: "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200",
  accent: "bg-accent-100 text-accent-700",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};
export function Badge({ tone = "neutral", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide", badgeTones[tone], className)} {...props} />;
}

/* ───────────── Section header ───────────── */
export function SectionHeader({ title, description, href, hrefLabel = "View all", as: Tag = "h2", className }: { title: string; description?: string; href?: string; hrefLabel?: string; as?: "h1" | "h2" | "h3"; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-5", className)}>
      <div>
        <Tag className={cn("font-semibold", Tag === "h1" ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl")}>{title}</Tag>
        {description ? <p className="mt-1 text-2">{description}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="shrink-0 text-sm font-medium text-brand-700 hover:text-brand-900 dark:text-brand-300">
          {hrefLabel} →
        </Link>
      ) : null}
    </div>
  );
}

/* ───────────── Empty state ───────────── */
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="surface px-6 py-14 text-center">
      <p className="text-lg font-medium">{title}</p>
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
            <span aria-hidden>/</span>
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
    neutral: "bg-surface-2 border-line",
    info: "bg-brand-50 border-brand-200 dark:bg-brand-950/40 dark:border-brand-800",
    warning: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    success: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
    danger: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
  };
  return (
    <div className={cn("rounded-md border px-4 py-3 text-[15px] leading-relaxed", tones[tone], className)}>
      {title ? <p className="font-medium mb-0.5">{title}</p> : null}
      <div className="text-2">{children}</div>
    </div>
  );
}
