import { bindings } from "@/lib/platform";

/**
 * Product events to Workers Analytics Engine (ADR-48): a handful of named events with a few string blobs and
 * numbers each, queried by /admin/metrics through the SQL API. No visitor identity, no cookies; page views stay
 * with Web Analytics and Clarity. Without the binding (Node, tests) this is a no-op, and it never throws.
 */
export type TrackEvent = "search_performed" | "calculator_used" | "directory_view" | "newsletter_subscribe" | "community_post";

export function track(name: TrackEvent, data: { blobs?: (string | null | undefined)[]; doubles?: number[] } = {}): void {
  try {
    bindings().ANALYTICS?.writeDataPoint({
      indexes: [name],
      blobs: [name, ...(data.blobs ?? []).map((b) => (b ?? "").slice(0, 200))],
      doubles: data.doubles ?? [],
    });
  } catch {
    // analytics must never break the request
  }
}
