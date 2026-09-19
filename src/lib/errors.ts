import { describe, fingerprint, normaliseRoute } from "@jet/errors";
import { sql } from "drizzle-orm";
import { getDb, rawQuery } from "@/db";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/markdown";
import { SITE } from "@/lib/utils";

/**
 * Error tracker (ADR-48): every uncaught server error (src/instrumentation.ts) and every crash the browser
 * reports (POST /api/client-errors) lands here. The fingerprint (packages/errors) collapses repeats into one
 * `error_fingerprints` row with a count; the first occurrence sends one email to the editorial address and
 * nothing else ever does. /admin/system lists the rows. Fire-and-forget: a failing write must never turn one
 * error into two, so everything is caught.
 */
export async function recordError(source: "server" | "client", route: string, err: unknown, sample: Record<string, unknown> = {}): Promise<void> {
  try {
    const facts = { route: normaliseRoute(route || "/"), ...describe(err) };
    const fp = await fingerprint(facts);
    const db = await getDb();
    const now = Date.now();
    const [row] = await rawQuery<{ count: number }>(
      db,
      sql`insert into error_fingerprints (fp, source, route, name, message, top_frame, sample, count, first_seen, last_seen)
          values (${fp}, ${source}, ${facts.route}, ${facts.name}, ${facts.message}, ${facts.topFrame}, ${JSON.stringify(sample).slice(0, 4000)}, 1, ${now}, ${now})
          on conflict (fp) do update set count = count + 1, last_seen = ${now}, message = excluded.message, sample = excluded.sample
          returning count`,
    );
    if (Number(row?.count) !== 1) return;
    const to = process.env.EDITORIAL_EMAIL ?? "editorial@searchable.pk";
    const title = `${facts.name}: ${facts.message.slice(0, 80)}`;
    await sendEmail({
      to,
      subject: `[error] ${source} ${facts.route}: ${title}`,
      html: `<p>New error on ${escapeHtml(SITE.url)} (${source}), route <code>${escapeHtml(facts.route)}</code>.</p><p><strong>${escapeHtml(title)}</strong></p>${facts.topFrame ? `<p><code>${escapeHtml(facts.topFrame)}</code></p>` : ""}<p>Fingerprint <code>${fp}</code>. Repeats are counted, not mailed: <a href="${SITE.url}/admin/system">admin/system</a>.</p>`,
      text: `New error (${source}) on ${facts.route}: ${title}\n${facts.topFrame ?? ""}\nFingerprint ${fp}. Repeats are counted on ${SITE.url}/admin/system.`,
    });
  } catch {
    // the database or the mailer is what failed; the platform log still has the original error
  }
}
