import { preload } from "react-dom";
import { srcSetFor } from "@/lib/images";
import { cn } from "@/lib/utils";

/**
 * Fixed-aspect image box. A plain <img> with a srcset of the renditions we wrote at upload time, so no
 * image-optimisation service (metered on free hosting plans) sits in the path. Works for local /uploads,
 * R2 URLs and remote photos alike.
 *
 * `priority` marks the one above-the-fold image: fetched eagerly at high priority and preloaded from the
 * document head, so it starts before the 200 KB of HTML has finished parsing. Everything else is lazy and
 * never offers the master rendition, so a 3x phone gets the 960 px file for a card, not the 1600 px one.
 */
export function Img({ src, alt, aspect = "16/9", className, sizes = "(min-width: 1024px) 800px, 100vw", priority, fit = "cover", width }: { src: string; alt: string; aspect?: string; className?: string; sizes?: string; priority?: boolean; fit?: "cover" | "contain"; /** Master width when known; trims the srcset. */ width?: number | null }) {
  const srcSet = srcSetFor(src, width, priority ? {} : { maxWidth: 960 });
  if (priority) preload(src, { as: "image", imageSrcSet: srcSet, imageSizes: srcSet ? sizes : undefined, fetchPriority: "high" });
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)} style={{ aspectRatio: aspect }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={cn("absolute inset-0 h-full w-full", fit === "contain" ? "object-contain" : "object-cover object-[50%_30%]")}
      />
    </div>
  );
}
