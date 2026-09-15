import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb, isPglite, rawQuery } from "../src/db";

/**
 * Go-live preflight: reads the environment the way the app does and says what is missing before a deploy.
 *   npm run preflight            (against .env / .env.local)
 *   DATABASE_URL=... npm run preflight
 * Exit code 1 when something required for production is absent.
 */
type Check = { name: string; ok: boolean; note?: string; required?: boolean };

async function main() {
  const env = process.env;
  const checks: Check[] = [];
  const has = (k: string) => !!env[k] && env[k]!.trim() !== "";
  const site = env.NEXT_PUBLIC_SITE_URL ?? "";

  checks.push({ name: "NEXT_PUBLIC_SITE_URL is https", ok: /^https:\/\//.test(site), note: site || "unset", required: true });
  checks.push({ name: "BETTER_AUTH_URL matches site URL", ok: !!site && (env.BETTER_AUTH_URL ?? "") === site, note: env.BETTER_AUTH_URL ?? "unset", required: true });
  checks.push({ name: "BETTER_AUTH_SECRET is 32+ chars and not the example", ok: (env.BETTER_AUTH_SECRET?.length ?? 0) >= 32 && !/change-me/.test(env.BETTER_AUTH_SECRET ?? ""), required: true });
  checks.push({ name: "DATABASE_URL is Postgres (not PGlite)", ok: !isPglite, note: isPglite ? "pglite://" : "postgres", required: true });
  checks.push({ name: "DATABASE_URL uses the transaction pooler (port 6543)", ok: /:6543\//.test(env.DATABASE_URL ?? ""), note: "Supabase: Connect > Transaction pooler; migrations use the session pooler on 5432" });
  checks.push({ name: "CRON_SECRET set", ok: has("CRON_SECRET"), required: true });
  checks.push({ name: "EMAIL_PROVIDER=resend with RESEND_API_KEY", ok: env.EMAIL_PROVIDER === "resend" && has("RESEND_API_KEY"), required: true });
  checks.push({ name: "EMAIL_FROM on the verified domain", ok: /@searchable\.pk>?$/.test(env.EMAIL_FROM ?? ""), note: env.EMAIL_FROM ?? "unset" });
  checks.push({ name: "STORAGE_PROVIDER=r2 with R2_* set", ok: env.STORAGE_PROVIDER === "r2" && ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"].every(has), note: env.STORAGE_PROVIDER ?? "local", required: true });
  checks.push({ name: "R2_PUBLIC_URL is https", ok: /^https:\/\//.test(env.R2_PUBLIC_URL ?? "") });
  checks.push({ name: "INDEXNOW_KEY set (32 hex)", ok: /^[a-f0-9]{32}$/i.test(env.INDEXNOW_KEY ?? "") });
  checks.push({ name: "CLAIM_WHATSAPP_NUMBER is a real number", ok: has("CLAIM_WHATSAPP_NUMBER") && !/0000000/.test(env.CLAIM_WHATSAPP_NUMBER ?? "") });
  checks.push({ name: "BILLING_EMAIL and EDITORIAL_EMAIL set", ok: has("BILLING_EMAIL") && has("EDITORIAL_EMAIL") });
  checks.push({ name: "AdSense client (optional until approved)", ok: has("NEXT_PUBLIC_ADSENSE_CLIENT"), note: has("NEXT_PUBLIC_ADSENSE_CLIENT") ? "on" : "off, fine for launch" });

  if (!isPglite) {
    try {
      const db = await getDb();
      await rawQuery(db, sql`select 1`);
      checks.push({ name: "Database reachable", ok: true, required: true });
      const [m] = await rawQuery<{ n: number }>(db, sql`select count(*)::int as n from drizzle.__drizzle_migrations`).catch(() => [{ n: -1 }]);
      checks.push({ name: "Migrations applied", ok: m?.n >= 11, note: m?.n >= 0 ? `${m.n} applied` : "migrations table missing: run npm run db:migrate", required: true });
      const [ext] = await rawQuery<{ n: number }>(db, sql`select count(*)::int as n from pg_extension where extname = 'pg_trgm'`).catch(() => [{ n: 0 }]);
      checks.push({ name: "pg_trgm extension enabled", ok: (ext?.n ?? 0) > 0, note: "Supabase: Database > Extensions > pg_trgm", required: true });
      const [docs] = await rawQuery<{ n: number }>(db, sql`select count(*)::int as n from search_documents`).catch(() => [{ n: 0 }]);
      checks.push({ name: "Search index populated", ok: (docs?.n ?? 0) > 0, note: `${docs?.n ?? 0} documents; run npm run search:reindex after seeding` });
      const [admin] = await rawQuery<{ n: number }>(db, sql`select count(*)::int as n from users where role = 'admin'`).catch(() => [{ n: 0 }]);
      checks.push({ name: "An admin user exists", ok: (admin?.n ?? 0) > 0, note: "SEED_MODE=reference npm run db:seed creates it from SEED_ADMIN_*", required: true });
    } catch (e) {
      checks.push({ name: "Database reachable", ok: false, note: (e as Error).message, required: true });
    }
  }

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "ok " : c.required ? "FAIL" : "warn";
    if (!c.ok && c.required) failed += 1;
    console.log(`${mark}  ${c.name}${c.note ? `  (${c.note})` : ""}`);
  }
  console.log(failed ? `\n${failed} required check${failed === 1 ? "" : "s"} failed.` : "\nReady to deploy.");
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
