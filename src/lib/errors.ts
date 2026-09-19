import { describe, fingerprint, normaliseRoute } from "@jet/errors";
import { sql } from "drizzle-orm";
import { getDb, rawRun } from "@/db";

/**
 * Error tracker (ADR-48): every uncaught server error (src/instrumentation.ts) and every crash the browser
 * reports (POST /api/client-errors) lands here. The fingerprint (packages/errors) collapses repeats into one
 * `error_fingerprints` row with a count. Nothing is emailed (the founder's call on 2026-09-19: mail is a scarce
 * budget, and a fix starts in admin anyway): new fingerprints show as a badge on the admin nav and a list on
 * /admin/system, where one is dismissed by deleting it (it comes back as new if it recurs). Fire-and-forget: a
 * failing write must never turn one error into two, so everything is caught.
 */
export async function recordError(source: "server" | "client", route: string, err: unknown, sample: Record<string, unknown> = {}): Promise<void> {
  try {
    const facts = { route: normaliseRoute(route || "/"), ...describe(err) };
    const fp = await fingerprint(facts);
    const db = await getDb();
    const now = Date.now();
    await rawRun(
      db,
      sql`insert into error_fingerprints (fp, source, route, name, message, top_frame, sample, count, first_seen, last_seen)
          values (${fp}, ${source}, ${facts.route}, ${facts.name}, ${facts.message}, ${facts.topFrame}, ${JSON.stringify(sample).slice(0, 4000)}, 1, ${now}, ${now})
          on conflict (fp) do update set count = count + 1, last_seen = ${now}, message = excluded.message, sample = excluded.sample`,
    );
  } catch {
    // the database is what failed; the platform log still has the original error
  }
}
