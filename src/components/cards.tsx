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

/* ───────────── Article ─────────────
   Newspaper items: label, serif headline, dek, meta. No boxes — hairlines from the parent. */
export function ArticleCard({ article, variant = "default", className }: { article: ArticleListItem; variant?: "default" | "compact" | "feature"; className?: string }) {
  const href = articleUrl(article);
  const isNews = article.kind === "news";
  const label = article.category?.name ?? (isNews ? "News" : "Guide");
  const meta = isNews && article.publishedAt ? timeAgo(article.publishedAt) : `${article.readingMinutes ?? 3} min read`;

  if (variant === "compact") {
    return (
      <article className={cn("py-3.5", className)}>
        <p className="eyebrow">{label}</p>
        <h3 className="mt-1 font-serif text-[19px] font-medium leading-snug">
          <Link href={href} className="headline-link">
            {article.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-3">{meta}</p>
      </article>
    );
  }
  if (variant === "feature") {
    return (
      <article className={cn("flex flex-col", className)}>
        <p className="eyebrow">{label}</p>
        <h2 className="mt-2 font-serif text-[2rem] font-medium leading-[1.12] sm:text-[2.6rem]">
          <Link href={href} className="headline-link">
            {article.title}
          </Link>
        </h2>
        {article.dek ? <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-2">{article.dek}</p> : null}
        <p className="mt-4 text-[13px] text-3">
          {article.author?.name ? `${article.author.name} · ` : ""}
          {article.publishedAt ? formatDate(article.publishedAt) : ""} · {article.readingMinutes ?? 3} min read
        </p>
      </article>
    );
  }
  return (
    <article className={cn("flex flex-col py-4", className)}>
      <p className="eyebrow">{label}</p>
      <h3 className="mt-1.5 font-serif text-xl font-medium leading-snug">
        <Link href={href} className="headline-link">
          {article.title}
        </Link>
      </h3>
      {article.dek ? <p className="mt-2 text-[15px] leading-relaxed text-2 line-clamp-3">{article.dek}</p> : null}
      <p className="mt-auto pt-3 text-xs text-3">{meta}</p>
    </article>
  );
}

/* ───────────── Tool ───────────── */
export function ToolCard({ tool, className }: { tool: Pick<ToolDefinition, "slug" | "category" | "name" | "shortName" | "description">; className?: string }) {
  return (
    <Link href={toolUrl(tool)} className={cn("group surface surface-hover flex flex-col p-5", className)}>
      <p className="eyebrow">{TOOL_CATEGORIES[tool.category].name}</p>
      <h3 className="mt-2 font-serif text-xl font-medium leading-snug group-hover:underline underline-offset-4 decoration-1 decoration-ink-400">{tool.shortName ?? tool.name}</h3>
      <p className="mt-1.5 text-[14.5px] leading-relaxed text-2 line-clamp-2">{tool.description}</p>
      <p className="mt-auto pt-4 text-[13px] font-medium text-3">Calculator →</p>
    </Link>
  );
}

/* ───────────── Business ───────────── */
export function Rating({ avg, count, className }: { avg: number; count: number; className?: string }) {
  if (!count) return <span className={cn("text-xs text-3", className)}>No reviews yet</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-3.5 fill-current text-[var(--text)]" aria-hidden />
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
    <article className={cn("surface surface-hover flex flex-col gap-3 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-serif text-xl font-medium leading-snug">
            <Link href={`/b/${b.slug}`} className="headline-link">
              {b.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-[13.5px] text-2">
            {b.categoryName}
            {b.areaName ? ` · ${b.areaName}` : ""}
            {b.cityName ? `, ${b.cityName}` : ""}
          </p>
        </div>
        {b.isVerified ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-700 dark:text-brand-300">
            <BadgeCheck className="size-3.5" /> Verified
          </span>
        ) : null}
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
      <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3 text-sm">
        {b.phone ? (
          <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline">
            <Phone className="size-3.5" /> Call
          </a>
        ) : null}
        {b.whatsapp ? (
          <a href={`https://wa.me/${b.whatsapp.replace(/\D/g, "").replace(/^0/, "92")}`} target="_blank" rel="noopener" className="font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300">
            WhatsApp
          </a>
        ) : null}
        <Link href={`/b/${b.slug}`} className="ml-auto font-medium text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
          Details →
        </Link>
      </div>
    </article>
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
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", isOpen ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-500")}>
      <Clock className="size-3.5" /> {isOpen ? "Open now" : "Closed"} · {today.opens}–{today.closes}
    </span>
  );
}

export { Badge };
