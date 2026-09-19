import { Param, SQL } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { bindings } from "@/lib/platform";
import * as schema from "./schema";

/*
 * The database is Cloudflare D1 (SQLite), reached through the `DB` binding (ADR-45). There is no connection
 * object to pool or close: the binding is request-safe, so a Drizzle instance is made per call. Locally the app
 * runs under `npm run dev:vinext`, where wrangler provides a local D1 in .wrangler/state; migrations are applied
 * with `npm run db:migrate` (local) or `npm run db:migrate:remote`.
 */
export type Database = DrizzleD1Database<typeof schema>;

type Globals = typeof globalThis & { __searchableDb?: Database };
const g = globalThis as Globals;

/** Returns the Drizzle database. Kept async because every caller already awaits it. */
export async function getDb(): Promise<Database> {
  const d1 = bindings().DB;
  if (!d1) throw new Error("No D1 binding: run the app with `npm run dev:vinext` (local D1) or deploy it with wrangler");
  // One Drizzle instance per isolate is fine: it holds no socket, only the binding and the schema.
  return (g.__searchableDb ??= drizzle(d1, { schema }));
}

/**
 * Dates in raw `sql` templates become epoch milliseconds, which is how every timestamp column is stored
 * (see _shared.ts), so `created_at > ${since}` compares numbers with numbers.
 */
function numberDates(query: SQL) {
  const chunks = query.queryChunks as unknown[];
  chunks.forEach((chunk, i) => {
    if (chunk instanceof Date) chunks[i] = chunk.getTime();
    else if (chunk instanceof Param && chunk.value instanceof Date) (chunk as { value: unknown }).value = chunk.value.getTime();
    else if (chunk instanceof SQL) numberDates(chunk);
  });
}

/** Run a raw SQL query and get its rows. */
export async function rawQuery<T = Record<string, unknown>>(db: Database, query: SQL): Promise<T[]> {
  numberDates(query);
  return (await db.all(query)) as T[];
}

/** Run a raw statement that returns no rows (delete, update) and report how many rows it changed. */
export async function rawRun(db: Database, query: SQL): Promise<number> {
  numberDates(query);
  const res = await db.run(query);
  return res.meta?.changes ?? 0;
}

export { schema };
