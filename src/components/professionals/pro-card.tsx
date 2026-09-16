import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { getProfession } from "@/content/professions";
import { Rating } from "@/components/cards";
import { srcSetFor } from "@/lib/images";
import type { ProfessionalCard } from "@/lib/professionals";
import { pkr } from "@/lib/format";
import { cn } from "@/lib/utils";

/** List card for a professional: photo, name, headline, city, badge, rate. */
export function ProCard({ p, className }: { p: ProfessionalCard; className?: string }) {
  const prof = getProfession(p.professionSlug);
  return (
    <Link href={`/p/${p.slug}`} className={cn("group flex gap-4 border-t border-line py-4", className)}>
      <div className="size-16 shrink-0 overflow-hidden bg-surface-2">
        {p.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photoUrl} srcSet={srcSetFor(p.photoUrl)} sizes="64px" alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center font-display text-2xl text-3">{p.name.slice(0, 1)}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 font-display text-lg leading-tight group-hover:underline underline-offset-4">
          {p.name}
          {p.isVerified ? <BadgeCheck className="size-4 text-[var(--text)]" aria-label="Verified" /> : null}
        </p>
        <p className="mt-0.5 text-[14px] text-2">
          {prof?.name ?? p.professionSlug}
          {p.headline ? ` · ${p.headline}` : ""}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-3">
          {[p.area?.name, p.city?.name].filter(Boolean).join(", ") || (p.serviceMode === "online" ? "Online" : null)}
          {p.yearsExperience ? <span>{p.yearsExperience} yrs</span> : null}
          {p.serviceMode === "both" ? <span>In person and online</span> : p.serviceMode === "online" && p.city ? <span>Online</span> : null}
          {p.ratingCount ? <Rating avg={p.ratingAvg} count={p.ratingCount} /> : null}
          {p.rateFrom ? (
            <span className="ml-auto tabular text-2">
              from {pkr(p.rateFrom)}
              {p.rateUnit ? `/${p.rateUnit}` : ""}
            </span>
          ) : null}
        </p>
        {p.skills.length ? <p className="mt-1 truncate text-[12.5px] text-3">{p.skills.slice(0, 6).join(" · ")}</p> : null}
      </div>
    </Link>
  );
}
