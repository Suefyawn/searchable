import { eq } from "drizzle-orm";
import { permanentRedirect, redirect } from "next/navigation";
import { getDb, schema } from "@/db";

/**
 * A moved page. Typed routes (/news/[category]/[slug], /b/[slug], /p/[slug]) own their paths, so the catch-all
 * never sees an old address under them; they call this before notFound() and follow a `redirects` row when
 * one exists. Same table the admin Redirects page edits.
 */
export async function followRedirect(path: string): Promise<never | void> {
  const db = await getDb();
  const hit = await db.query.redirects.findFirst({ where: eq(schema.redirects.fromPath, path) });
  if (!hit) return;
  if (hit.statusCode === 301 || hit.statusCode === 308) permanentRedirect(hit.toPath);
  redirect(hit.toPath);
}

/** Record that `from` now lives at `to` (idempotent; a later move updates the target). */
export async function recordRedirect(from: string, to: string, statusCode = 301): Promise<void> {
  if (from === to) return;
  const db = await getDb();
  await db.insert(schema.redirects).values({ fromPath: from, toPath: to, statusCode }).onConflictDoUpdate({ target: schema.redirects.fromPath, set: { toPath: to, statusCode } });
  // A chain (a -> b, then b -> c) collapses so the first address still lands in one hop.
  await db.update(schema.redirects).set({ toPath: to }).where(eq(schema.redirects.toPath, from));
}
