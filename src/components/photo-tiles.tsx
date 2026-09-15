import Link from "next/link";
import { Img } from "@/components/img";
import { cn } from "@/lib/utils";

/**
 * Photo tiles for cities and business categories. A real, credited photo with a plain caption below, 
 * no gradients or text-over-image, so it stays legible and quiet (ADR-15).
 */
export function PhotoTile({ href, title, meta, imageUrl, aspect = "4/3", className, sizes = "(min-width: 1024px) 300px, 50vw" }: { href: string; title: string; meta?: string; imageUrl: string | null; aspect?: string; className?: string; sizes?: string }) {
  return (
    <Link href={href} className={cn("group block", className)}>
      {imageUrl ? (
        <Img src={imageUrl} alt="" aspect={aspect} sizes={sizes} className="transition-opacity group-hover:opacity-90" />
      ) : (
        <div className="flex items-center justify-center bg-surface-2 font-serif text-3xl text-ink-300" style={{ aspectRatio: aspect }}>
          {title.charAt(0)}
        </div>
      )}
      <p className="mt-2 font-serif text-lg leading-tight group-hover:underline group-hover:underline-offset-4">{title}</p>
      {meta ? <p className="text-xs text-3">{meta}</p> : null}
    </Link>
  );
}

/** Wide banner for a hub page (city, business category): photo on the right, credit underneath. */
export function HubBanner({ imageUrl, credit, alt, children, className }: { imageUrl: string | null; credit?: string | null; alt: string; children: React.ReactNode; className?: string }) {
  if (!imageUrl) return <div className={className}>{children}</div>;
  return (
    <div className={cn("grid items-end gap-6 lg:grid-cols-[1fr_minmax(0,520px)]", className)}>
      <div>{children}</div>
      <figure className="lg:justify-self-end lg:w-full">
        <Img src={imageUrl} alt={alt} aspect="16/9" priority sizes="(min-width: 1024px) 520px, 100vw" />
        {credit ? <figcaption className="mt-1 text-right text-[11px] text-3">Photo: {credit}</figcaption> : null}
      </figure>
    </div>
  );
}
