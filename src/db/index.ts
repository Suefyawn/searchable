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
    const { drizzle } = await import("drizzle-orm/pglite");
    const dataDir = DATABASE_URL.replace("pglite://", "");
    const client = await PGlite.create({ dataDir });
    return drizzle(client, { schema }) as unknown as Database;
  }
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const client = postgres(DATABASE_URL, { max: 10, prepare: false });
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
