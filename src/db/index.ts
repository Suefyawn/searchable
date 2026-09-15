import "dotenv/config";
import type { SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const DATABASE_URL = process.env.DATABASE_URL ?? "pglite://./.data/pglite";
export const isPglite = DATABASE_URL.startsWith("pglite://");

type Globals = typeof globalThis & {
  __searchableDb?: Database;
  __searchableDbPromise?: Promise<Database>;
};
const g = globalThis as Globals;

async function create(): Promise<Database> {
  if (isPglite) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm");
    const { drizzle } = await import("drizzle-orm/pglite");
    const dataDir = DATABASE_URL.replace("pglite://", "");
    // pg_trgm powers typo-tolerant search (migration 0005); Supabase has it built in.
    const client = await PGlite.create({ dataDir, extensions: { pg_trgm } });
    return drizzle(client, { schema }) as unknown as Database;
  }
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // Serverless: one connection per function instance, released quickly, so the Supabase pooler (port 6543)
  // never runs out of slots on the free plan. Long-running servers can hold a few.
  // Supavisor in transaction mode hangs when postgres-js pipelines more than a couple of queries on one
  // connection (a page's Promise.all of eight queries stalled for good), so pipelining is off: queued
  // queries go one at a time, which costs a few hundred milliseconds on a cold render and nothing on ISR hits.
  const serverless = !!process.env.VERCEL || !!process.env.CF_PAGES || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  // max_pipeline is a documented postgres-js option that its type definitions leave out.
  const options = { max: serverless ? 1 : 5, prepare: false, max_pipeline: 0, idle_timeout: 20, connect_timeout: 10 } as Parameters<typeof postgres>[1];
  const client = postgres(DATABASE_URL, options);
  return drizzle(client, { schema }) as unknown as Database;
}

/**
 * Returns the Drizzle database. A globalThis singleton survives Next.js HMR so PGlite
 * never opens the same data directory twice.
 */
export async function getDb(): Promise<Database> {
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
 * Run a raw SQL query and always get rows back as an array, regardless of driver
 * (PGlite returns { rows }, postgres-js returns an array-like RowList).
 */
export async function rawQuery<T = Record<string, unknown>>(db: Database, query: SQL): Promise<T[]> {
  const result = (await db.execute(query)) as unknown;
  if (Array.isArray(result)) return result as T[];
  return ((result as { rows?: T[] }).rows ?? []) as T[];
}

export { schema };
