import { BadgeCheck, MessageCircle } from "lucide-react";
import Link from "next/link";
import { srcSetFor } from "@/lib/images";
import { kindLabel, type PostRow } from "@/lib/community";
import { pkr, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The number that matters for each kind, if any. */
export function postFigure(p: PostRow): string | null {
  const m = p.meta;
  if (p.kind === "listing" && m.price !== undefined) return m.price === 0 ? "Free" : `${pkr(m.price)}${m.negotiable ? " (neg.)" : ""}`;
  if (p.kind === "auction") return p.highestBid ? `Bid ${pkr(p.highestBid)}` : m.startPrice ? `From ${pkr(m.startPrice)}` : null;
  if (p.kind === "job") {
    if (m.salaryMin && m.salaryMax) return `${pkr(m.salaryMin)} to ${pkr(m.salaryMax)}`;
    if (m.salaryMin) return `From ${pkr(m.salaryMin)}`;
    if (m.salaryMax) return `Up to ${pkr(m.salaryMax)}`;
  }
  return null;
}

export function PostCard({ p, className, showKind = true }: { p: PostRow; className?: string; showKind?: boolean }) {
  const figure = postFigure(p);
  const img = p.images[0];
  const sub = [p.kind === "job" ? p.meta.company : null, p.topic, p.city?.name ?? p.meta.location].filter(Boolean).join(" · ");
  return (
    <Link href={`/community/post/${p.slug}`} className={cn("group flex gap-4 border-t border-line py-4", className)}>
      {img ? (
        <div className="hidden size-20 shrink-0 overflow-hidden bg-surface-2 sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} srcSet={srcSetFor(img.url)} sizes="80px" alt="" loading="lazy" className="size-full object-cover" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-3">
          {showKind ? <span>{kindLabel(p.kind)}</span> : null}
          {p.isVerified ? (
            <span className="inline-flex items-center gap-1 text-[var(--text)]">
              <BadgeCheck className="size-3.5" /> Verified
            </span>
          ) : null}
          {p.isPinned ? <span>Pinned</span> : null}
          {p.status === "closed" ? <span>Closed</span> : null}
        </p>
        <h3 className="mt-1 font-serif text-lg font-medium leading-snug group-hover:underline underline-offset-4">{p.title}</h3>
        {sub ? <p className="mt-0.5 text-[13.5px] text-2">{sub}</p> : null}
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-3">
          <span>{p.author.name}</span>
          <span>{timeAgo(p.publishedAt ?? p.createdAt)}</span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" /> {p.commentCount}
          </span>
          <span>{p.likeCount} likes</span>
          {p.kind === "auction" ? <span>{p.bidCount} bids</span> : null}
        </p>
      </div>
      {figure ? <p className="shrink-0 self-start font-serif text-lg tabular">{figure}</p> : null}
    </Link>
  );
}
