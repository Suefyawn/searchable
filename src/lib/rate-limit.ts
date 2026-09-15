import { headers } from "next/headers";

/**
 * In-memory sliding-window rate limiter keyed by client IP. Good enough for a single
 * instance and as a first line of defence; Phase 2 adds Turnstile on forms and Phase 9 moves
 * this to Redis/Upstash when running on many instances.
 */
type Bucket = { hits: number[]; };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    b.hits = b.hits.filter((t) => now - t < windowMs);
    if (!b.hits.length) buckets.delete(k);
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
}

/** Returns true if the request is allowed. `limit` hits per `windowMs` per key. */
export async function rateLimit(scope: string, limit: number, windowMs = 60_000): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const ip = await clientIp();
  const key = `${scope}:${ip}`;
  const now = Date.now();
  sweep(now, windowMs);
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= limit) {
    buckets.set(key, b);
    return { ok: false, retryAfterSeconds: Math.ceil((windowMs - (now - b.hits[0])) / 1000) };
  }
  b.hits.push(now);
  buckets.set(key, b);
  return { ok: true, retryAfterSeconds: 0 };
}

export const LIMITS = {
  newsletter: { limit: 5, windowMs: 10 * 60_000 },
  toolRun: { limit: 60, windowMs: 60_000 },
  lead: { limit: 5, windowMs: 10 * 60_000 },
  submitBusiness: { limit: 3, windowMs: 60 * 60_000 },
  contact: { limit: 5, windowMs: 10 * 60_000 },
  search: { limit: 120, windowMs: 60_000 },
  claim: { limit: 5, windowMs: 10 * 60_000 },
} as const;
