import "dotenv/config";
import { Param, SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { bindings } from "@/lib/platform";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

// Scripts and local development read DATABASE_URL, defaulting to the PGlite directory. On Workers the Hyperdrive
// binding carries the connection string instead; it is read inside create(), never at module scope, because a
// Worker may not touch bindings while its modules load.
const ENV_URL = process.env.DATABASE_URL ?? "pglite://./.data/pglite";
export const isPglite = ENV_URL.startsWith("pglite://");

type Globals = typeof globalThis & {
  __searchableDb?: Database;
  __searchableDbPromise?: Promise<Database>;
};
const g = globalThis as Globals;

async function create(): Promise<Database> {
  const hyperdrive = bindings().HYPERDRIVE;
  const DATABASE_URL = hyperdrive?.connectionString ?? ENV_URL;
  if (!hyperdrive && isPglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
    const { drizzle } = await import("drizzle-orm/pglite");
    const dataDir = DATABASE_URL.replace("pglite://", "");
    // PGlite creates the data directory itself but not its parent; a fresh checkout (CI) has no .data/ yet.
    const [{ mkdirSync }, path] = await Promise.all([import("node:fs"), import("node:path")]);
    mkdirSync(path.dirname(dataDir), { recursive: true });
    // pg_trgm powers typo-tolerant search (migration 0005); Supabase has it built in.
    const client = await PGlite.create({ dataDir, extensions: { pg_trgm } });
    return drizzle(client, { schema }) as unknown as Database;
  }
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // Serverless: one connection per function instance, released quickly, so the Supabase pooler (port 6543)
  // never runs out of slots on the free plan. Long-running servers can hold a few.
  // Supavisor in transaction mode (port 6543, what the app uses) hangs when postgres-js pipelines more than a
  // couple of queries on one connection (a page's Promise.all of eight queries stalled for good), so pipelining
  // is off there: queued queries go one at a time, a few hundred milliseconds on a cold render, nothing on ISR
  // hits. Pipelining off also disables postgres-js transactions, which the app never uses but the migrator
  // does; scripts run on the session pooler (5432), where pipelining stays on.
  const serverless = !!hyperdrive || !!process.env.VERCEL || !!process.env.CF_PAGES || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const transactionPooler = /:6543\//.test(DATABASE_URL);
  // max_pipeline is a documented postgres-js option that its type definitions leave out.
  // Through Hyperdrive the client lives for one call, so it must not hold its socket open afterwards, and the
  // type lookup postgres-js does on connect is skipped (Cloudflare's guidance; the schema uses no array types).
  const options = { max: serverless ? 1 : 5, prepare: false, max_pipeline: transactionPooler ? 0 : 100, idle_timeout: hyperdrive ? 2 : 20, connect_timeout: 10, ...(hyperdrive ? { fetch_types: false } : {}) } as Parameters<typeof postgres>[1];
  const client = postgres(DATABASE_URL, options);
  return drizzle(client, { schema }) as unknown as Database;
}

/**
 * Returns the Drizzle database. A globalThis singleton survives Next.js HMR so PGlite
 * never opens the same data directory twice.
 *
 * On Workers there is no singleton: a socket belongs to the request that opened it, and reusing it from the
 * next request hangs that request for good (seen on staging, 2026-09-19). Hyperdrive pools connections a few
 * milliseconds away, so a fresh client per call is cheap.
 */
// ponytail: one client per getDb() call on Workers (a page makes 5 to 15); share one per request through
// AsyncLocalStorage if Hyperdrive connection counts ever matter. Phase 2 (D1) removes the question.
export async function getDb(): Promise<Database> {
  if (bindings().HYPERDRIVE) return create();
  if (g.__searchableDb) return g.__searchableDb;
  if (!g.__searchableDbPromise) {
    g.__searchableDbPromise = create().then((db) => {
      g.__searchableDb = db;
      return db;
    });
  }
  return g.__searchableDbPromise;
}

/**
 * postgres-js cannot serialise a Date handed to it through a raw `sql` template (drizzle passes the value
 * untyped and the driver tries to measure it as a string). ISO text compares fine against timestamptz, so
 * every Date parameter in a raw query is converted before it reaches the driver. PGlite accepts both.
 */
function stringifyDates(query: SQL) {
  const chunks = query.queryChunks as unknown[];
  chunks.forEach((chunk, i) => {
    if (chunk instanceof Date) chunks[i] = chunk.toISOString();
    else if (chunk instanceof Param && chunk.value instanceof Date) (chunk as { value: unknown }).value = chunk.value.toISOString();
    else if (chunk instanceof SQL) stringifyDates(chunk);
  });
}

/**
 * Run a raw SQL query and always get rows back as an array, regardless of driver
 * (PGlite returns { rows }, postgres-js returns an array-like RowList).
 */
export async function rawQuery<T = Record<string, unknown>>(db: Database, query: SQL): Promise<T[]> {
  stringifyDates(query);
  const result = (await db.execute(query)) as unknown;
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

export { schema };
