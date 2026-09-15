import Image from "next/image";
import { cn } from "@/lib/utils";

/** Fixed-aspect image box. Works for local /uploads and remote (Supabase) URLs. */
export function Img({ src, alt, aspect = "16/9", className, sizes = "(min-width: 1024px) 800px, 100vw", priority, fit = "cover" }: { src: string; alt: string; aspect?: string; className?: string; sizes?: string; priority?: boolean; fit?: "cover" | "contain" }) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)} style={{ aspectRatio: aspect }}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={fit === "contain" ? "object-contain" : "object-cover"} />
    </div>
  );
}
