import { ArrowUpRight, BadgeCheck, Car, Clock, Landmark, LandPlot, MapPin, Percent, Phone, Smartphone, Star, Sun, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { Badge } from "@/components/ui";
import type { ArticleListItem } from "@/db/queries/content";
import type { BusinessCard as BusinessCardData } from "@/db/queries/directory";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ToolCategory, ToolDefinition } from "@/tools/types";
import { TOOL_CATEGORIES } from "@/tools/types";
import { toolUrl } from "@/tools/registry";

export function articleUrl(a: Pick<ArticleListItem, "kind" | "slug" | "category">) {
  return `/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}`;
}

/* ───────────── Article ───────────── */
export function ArticleCard({ article, variant = "default", className }: { article: ArticleListItem; variant?: "default" | "compact" | "feature"; className?: string }) {
  const href = articleUrl(article);
  const isNews = article.kind === "news";
  const label = article.category?.name ?? (isNews ? "News" : "Guide");
  if (variant === "compact") {
    return (
      <Link href={href} className={cn("group block py-3.5", className)}>
        <p className="eyebrow">{label}</p>
        <p className="mt-1 font-display text-[17px] font-semibold leading-snug transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">{article.title}</p>
        <p className="mt-1 text-xs text-3">{isNews && article.publishedAt ? timeAgo(article.publishedAt) : `${article.readingMinutes ?? 3} min read`}</p>
      </Link>
    );
  }
  if (variant === "feature") {
    return (
      <Link href={href} className={cn("group surface surface-hover relative flex flex-col overflow-hidden p-7 sm:p-9", className)}>
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand-100/70 blur-2xl dark:bg-brand-900/30" />
        <p className="eyebrow">{label}</p>
        <h3 className="mt-3 font-display text-3xl font-semibold leading-[1.1] sm:text-4xl">{article.title}</h3>
        {article.dek ? <p className="mt-4 text-[17px] leading-relaxed text-2 line-clamp-3">{article.dek}</p> : null}
        <p className="mt-auto flex items-center gap-2 pt-6 text-sm text-3">
          {article.publishedAt ? formatDate(article.publishedAt) : ""} · {article.readingMinutes ?? 3} min read
          <ArrowUpRight className="ml-auto size-5 text-brand-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </p>
      </Link>
    );
  }
  return (
    <Link href={href} className={cn("group surface surface-hover flex flex-col p-6", className)}>
      <p className="eyebrow">{label}</p>
      <h3 className="mt-2 font-display text-xl font-semibold leading-snug transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">{article.title}</h3>
      {article.dek ? <p className="mt-2 text-[15px] text-2 line-clamp-3">{article.dek}</p> : null}
      <p className="mt-auto pt-5 text-xs text-3">
        {isNews && article.publishedAt ? timeAgo(article.publishedAt) : "Guide"} · {article.readingMinutes ?? 3} min
      </p>
    </Link>
  );
}

/* ───────────── Tool ───────────── */
const TOOL_TONES: Record<ToolCategory, { tile: string; badge: "brand" | "accent" | "sky" | "violet" | "rose" }> = {
  tax: { tile: "from-brand-500 to-brand-700", badge: "brand" },
  finance: { tile: "from-violet-500 to-violet-700", badge: "violet" },
  cars: { tile: "from-sky-500 to-sky-700", badge: "sky" },
  property: { tile: "from-accent-500 to-accent-700", badge: "accent" },
  utilities: { tile: "from-rose-500 to-rose-700", badge: "rose" },
  government: { tile: "from-ink-600 to-ink-800", badge: "brand" },
  solar: { tile: "from-accent-500 to-accent-700", badge: "accent" },
  telecom: { tile: "from-sky-500 to-sky-700", badge: "sky" },
};

const TOOL_ICON: Record<ToolCategory, React.ComponentType<{ className?: string }>> = { tax: Percent, finance: Wallet, cars: Car, property: LandPlot, utilities: Zap, government: Landmark, solar: Sun, telecom: Smartphone };

export function ToolCard({ tool, className }: { tool: Pick<ToolDefinition, "slug" | "category" | "name" | "shortName" | "description">; className?: string }) {
  const tone = TOOL_TONES[tool.category];
  const Icon = TOOL_ICON[tool.category];
  return (
    <Link href={toolUrl(tool)} className={cn("group surface surface-hover flex flex-col p-6", className)}>
      <div className="flex items-center justify-between">
        <span className={cn("grid size-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md", tone.tile)} aria-hidden>
          <Icon className="size-5" />
        </span>
        <Badge tone={tone.badge}>{TOOL_CATEGORIES[tool.category].name}</Badge>
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold leading-snug transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-300">{tool.shortName ?? tool.name}</h3>
      <p className="mt-1.5 text-[15px] text-2 line-clamp-2">{tool.description}</p>
      <p className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-brand-700 dark:text-brand-300">
        Calculate <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </p>
    </Link>
  );
}

/* ───────────── Business ───────────── */
export function Rating({ avg, count, className }: { avg: number; count: number; className?: string }) {
  if (!count) return <span className={cn("text-xs text-3", className)}>No reviews yet</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-4 fill-accent-500 text-accent-500" aria-hidden />
      <span className="font-semibold tabular">{avg.toFixed(1)}</span>
      <span className="text-3">({count.toLocaleString()})</span>
    </span>
  );
}

/** Price level 1–4 as "Rs" segments: filled ones dark, the rest faint. */
export function PriceRange({ level, className }: { level: number; className?: string }) {
  const n = Math.min(4, Math.max(1, level));
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold tabular", className)} aria-label={`Price level ${n} of 4`} title={["Budget", "Moderate", "Upmarket", "Premium"][n - 1]}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={i <= n ? "text-[var(--text)]" : "text-ink-300 dark:text-ink-700"}>
          Rs
        </span>
      ))}
    </span>
  );
}

export function BusinessCard({ business: b, className }: { business: BusinessCardData; className?: string }) {
  const initials = b.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const featured = b.tier === "premium" || b.tier === "sponsored";
  return (
    <div className={cn("surface surface-hover flex flex-col gap-4 p-6", featured ? "shadow-glow" : "", className)}>
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ink-100 to-ink-200 font-display text-base font-bold text-ink-700 dark:from-ink-700 dark:to-ink-800 dark:text-ink-100" aria-hidden>
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/b/${b.slug}`} className="font-display text-lg font-semibold leading-snug hover:text-brand-700 dark:hover:text-brand-300">
              {b.name}
            </Link>
            {b.isVerified ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                <BadgeCheck className="size-3.5" /> Verified
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-2">
            {b.categoryName}
            {b.areaName ? ` · ${b.areaName}` : ""}
            {b.cityName ? `, ${b.cityName}` : ""}
          </p>
        </div>
      </div>
      {b.tagline ? <p className="text-[15px]">{b.tagline}</p> : b.description ? <p className="text-[15px] text-2 line-clamp-2">{b.description}</p> : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-2">
        <Rating avg={b.ratingAvg} count={b.ratingCount} />
        {b.priceRange ? <PriceRange level={b.priceRange} /> : null}
        {b.address ? (
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{b.address}</span>
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {b.phone ? (
          <a href={`tel:${b.phone}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-sm font-semibold hover:bg-surface-3">
            <Phone className="size-4" /> Call
          </a>
        ) : null}
        {b.whatsapp ? (
          <a href={`https://wa.me/${b.whatsapp.replace(/\D/g, "").replace(/^0/, "92")}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
            WhatsApp
          </a>
        ) : null}
        <Link href={`/b/${b.slug}`} className="ml-auto inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40">
          Details <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function OpenNow({ hours }: { hours: { dayOfWeek: number; opens: string | null; closes: string | null; isClosed: boolean }[] }) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
  const today = hours.find((h) => h.dayOfWeek === now.getDay());
  if (!today || today.isClosed || !today.opens || !today.closes) return <span className="text-sm text-3">Hours not listed</span>;
  const [oh, om] = today.opens.split(":").map(Number);
  const [ch, cm] = today.closes.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = oh * 60 + om;
  let close = ch * 60 + cm;
  if (close <= open) close += 24 * 60;
  const isOpen = mins >= open && mins <= close;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold", isOpen ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-rose-100 text-rose-700 dark:bg-rose-700/30 dark:text-rose-100")}>
      <Clock className="size-3.5" /> {isOpen ? "Open now" : "Closed"} · {today.opens}–{today.closes}
    </span>
  );
}
