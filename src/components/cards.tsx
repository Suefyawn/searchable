import { BadgeCheck, Clock, MapPin, Phone, Star } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import type { ArticleListItem } from "@/db/queries/content";
import type { BusinessCard as BusinessCardData } from "@/db/queries/directory";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ToolDefinition } from "@/tools/types";
import { TOOL_CATEGORIES } from "@/tools/types";
import { toolUrl } from "@/tools/registry";

export function articleUrl(a: Pick<ArticleListItem, "kind" | "slug" | "category">) {
  return `/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}`;
}

/* ───────────── Article ───────────── */
export function ArticleCard({ article, variant = "default", className }: { article: ArticleListItem; variant?: "default" | "compact" | "feature"; className?: string }) {
  const href = articleUrl(article);
  const isNews = article.kind === "news";
  if (variant === "compact") {
    return (
      <Link href={href} className={cn("group block py-3", className)}>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">{article.category?.name ?? (isNews ? "News" : "Guide")}</p>
        <p className="mt-0.5 font-medium leading-snug group-hover:text-brand-800 dark:group-hover:text-brand-200">{article.title}</p>
        <p className="mt-1 text-xs text-3">{isNews && article.publishedAt ? timeAgo(article.publishedAt) : `${article.readingMinutes ?? 3} min read`}</p>
      </Link>
    );
  }
  if (variant === "feature") {
    return (
      <Link href={href} className={cn("group surface flex flex-col p-6 sm:p-8 hover:border-brand-300 transition-colors", className)}>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">{article.category?.name ?? (isNews ? "News" : "Guide")}</p>
        <h3 className="mt-2 text-2xl sm:text-3xl font-semibold leading-tight group-hover:text-brand-800 dark:group-hover:text-brand-200">{article.title}</h3>
        {article.dek ? <p className="mt-3 text-2 text-[17px] leading-relaxed line-clamp-3">{article.dek}</p> : null}
        <p className="mt-auto pt-5 text-sm text-3">
          {article.publishedAt ? formatDate(article.publishedAt) : ""} · {article.readingMinutes ?? 3} min read
        </p>
      </Link>
    );
  }
  return (
    <Link href={href} className={cn("group surface flex flex-col p-5 hover:border-brand-300 transition-colors", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">{article.category?.name ?? (isNews ? "News" : "Guide")}</p>
      <h3 className="mt-1.5 text-lg font-semibold leading-snug group-hover:text-brand-800 dark:group-hover:text-brand-200">{article.title}</h3>
      {article.dek ? <p className="mt-2 text-[15px] text-2 line-clamp-3">{article.dek}</p> : null}
      <p className="mt-auto pt-4 text-xs text-3">
        {isNews && article.publishedAt ? timeAgo(article.publishedAt) : `Guide`} · {article.readingMinutes ?? 3} min
      </p>
    </Link>
  );
}

/* ───────────── Tool ───────────── */
export function ToolCard({ tool, className }: { tool: Pick<ToolDefinition, "slug" | "category" | "name" | "shortName" | "description">; className?: string }) {
  return (
    <Link href={toolUrl(tool)} className={cn("group surface flex flex-col p-5 hover:border-brand-300 transition-colors", className)}>
      <div className="flex items-center gap-2">
        <Badge tone="brand">{TOOL_CATEGORIES[tool.category].name}</Badge>
        <span className="text-[11px] font-medium uppercase tracking-wider text-3">Calculator</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug group-hover:text-brand-800 dark:group-hover:text-brand-200">{tool.shortName ?? tool.name}</h3>
      <p className="mt-1.5 text-[15px] text-2 line-clamp-2">{tool.description}</p>
      <p className="mt-auto pt-4 text-sm font-medium text-brand-700 dark:text-brand-300">Open →</p>
    </Link>
  );
}

/* ───────────── Business ───────────── */
export function Rating({ avg, count, className }: { avg: number; count: number; className?: string }) {
  if (!count) return <span className={cn("text-xs text-3", className)}>No reviews yet</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-4 fill-accent-500 text-accent-500" aria-hidden />
      <span className="font-medium tabular">{avg.toFixed(1)}</span>
      <span className="text-3">({count.toLocaleString()})</span>
    </span>
  );
}

/** Price level 1–4 as "Rs" segments: filled ones dark, the rest faint. */
export function PriceRange({ level, className }: { level: number; className?: string }) {
  const n = Math.min(4, Math.max(1, level));
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular", className)} aria-label={`Price level ${n} of 4`} title={["Budget", "Moderate", "Upmarket", "Premium"][n - 1]}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={i <= n ? "text-[var(--text)]" : "text-ink-300 dark:text-ink-700"}>
          Rs
        </span>
      ))}
    </span>
  );
}

export function BusinessCard({ business: b, className }: { business: BusinessCardData; className?: string }) {
  return (
    <div className={cn("surface p-5 flex flex-col gap-3", b.tier === "premium" || b.tier === "sponsored" ? "border-brand-300 dark:border-brand-700" : "", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/b/${b.slug}`} className="text-lg font-semibold leading-snug hover:text-brand-800 dark:hover:text-brand-200">
            {b.name}
          </Link>
          <p className="mt-0.5 text-sm text-2">
            {b.categoryName}
            {b.areaName ? ` · ${b.areaName}` : ""}
            {b.cityName ? `, ${b.cityName}` : ""}
          </p>
        </div>
        {b.isVerified ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
            <BadgeCheck className="size-3.5" /> Verified
          </span>
        ) : null}
      </div>
      {b.tagline ? <p className="text-[15px]">{b.tagline}</p> : b.description ? <p className="text-[15px] text-2 line-clamp-2">{b.description}</p> : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-2">
        <Rating avg={b.ratingAvg} count={b.ratingCount} />
        {b.priceRange ? <PriceRange level={b.priceRange} /> : null}
        {b.address ? (
          <span className="inline-flex items-center gap-1 truncate">
            <MapPin className="size-3.5 shrink-0" /> <span className="truncate">{b.address}</span>
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {b.phone ? (
          <a href={`tel:${b.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-sm font-medium hover:bg-surface-2">
            <Phone className="size-4" /> Call
          </a>
        ) : null}
        {b.whatsapp ? (
          <a href={`https://wa.me/${b.whatsapp.replace(/\D/g, "").replace(/^0/, "92")}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700">
            WhatsApp
          </a>
        ) : null}
        <Link href={`/b/${b.slug}`} className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/40">
          Details →
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
  if (close <= open) close += 24 * 60; // closes after midnight
  const isOpen = mins >= open && mins <= close;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", isOpen ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>
      <Clock className="size-4" /> {isOpen ? "Open now" : "Closed"} · {today.opens}–{today.closes}
    </span>
  );
}
