/**
 * @jet/errors: fingerprinting only (ADR-48). Storage and alerting belong to the site, because they depend on
 * its database and mailer; this package is the part every site shares and can test without either.
 *
 * A fingerprint is the first 16 hex characters of sha256(route | name | top frame). Two occurrences of the same
 * bug on the same route collapse into one row; the same bug on another route is another row, which is what a
 * reader of the list wants to know. The message is not part of it, because messages carry ids and values.
 */
export type ErrorFacts = { route: string; name: string; message: string; topFrame: string | null };

/** Name, message and the first frame of the stack that is application code (not node:, not a dependency). */
export function describe(err: unknown): Omit<ErrorFacts, "route"> {
  const e = err as { name?: unknown; message?: unknown; stack?: unknown } | null;
  const name = typeof e?.name === "string" && e.name ? e.name : "Error";
  const message = String(e?.message ?? err ?? "").slice(0, 500);
  const frames = String(e?.stack ?? "")
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("at "));
  const own = frames.find((f) => !/node_modules|node:|\(native\)|<anonymous>$/.test(f)) ?? frames[0] ?? null;
  return { name, message, topFrame: own ? normaliseFrame(own).slice(0, 300) : null };
}

/** Strip line and column numbers so a redeploy does not mint a new fingerprint for the same bug. */
export function normaliseFrame(frame: string): string {
  return frame.replace(/:\d+:\d+\)?$/, ")").replace(/\?[^)]*\)/, ")").replace(/https?:\/\/[^/]+/, "");
}

/** Route patterns already collapse dynamic segments; a raw path is normalised so ids and slugs do not fan out. */
export function normaliseRoute(route: string): string {
  return route
    .split("?")[0]!
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/:id")
    .replace(/\/[a-z0-9]{20,}/gi, "/:id")
    .replace(/\/\d+(?=\/|$)/g, "/:n")
    .slice(0, 200);
}

export async function fingerprint(facts: ErrorFacts): Promise<string> {
  const input = `${normaliseRoute(facts.route)}|${facts.name}|${facts.topFrame ?? ""}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
