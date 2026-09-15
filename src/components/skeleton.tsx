import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-surface-2", className)} aria-hidden />;
}

/** Generic section skeleton: heading + a few article-like rows. */
export function ListSkeleton({ rows = 6, title = true }: { rows?: number; title?: boolean }) {
  return (
    <div className="container-x py-8 sm:py-12" aria-busy="true" aria-label="Loading">
      {title ? (
        <>
          <Skeleton className="h-10 w-72" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        </>
      ) : null}
      <div className="mt-8 divide-y divide-[var(--border)] border-t border-line">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2 py-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div className="container-x py-8 sm:py-12" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-6 h-3 w-16" />
      <Skeleton className="mt-3 h-12 w-3/4" />
      <Skeleton className="mt-2 h-12 w-1/2" />
      <Skeleton className="mt-5 h-6 w-2/3" />
      <div className="mt-10 max-w-[66ch] space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4", i % 3 === 2 ? "w-2/3" : "w-full")} />
        ))}
      </div>
    </div>
  );
}
