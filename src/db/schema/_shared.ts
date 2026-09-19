import { sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core";

/*
 * Column helpers for the SQLite (D1) schema. Translation from the Postgres schema is in docs/schema-notes.md:
 * timestamps are integer milliseconds since the epoch (Drizzle hands out Date objects), JSON is text in JSON
 * mode, booleans are 0/1 integers, enums are text columns with a CHECK constraint.
 */

/** Text primary key with a random UUID default. Used everywhere so polymorphic refs share one type. */
export const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/** Milliseconds since the epoch; `unixepoch('subsec')` keeps sub-second precision on the SQL default. */
export const timestampMs = (name: string) => integer(name, { mode: "timestamp_ms" });
export const nowMs = () => sql`(cast(unixepoch('subsec') * 1000 as integer))`;

export const createdAt = () => timestampMs("created_at").default(nowMs()).notNull();

export const updatedAt = () =>
  timestampMs("updated_at")
    .default(nowMs())
    .notNull()
    .$onUpdate(() => new Date());

/**
 * An enumerated text column. Call sites read `x.enumValues` exactly as they did with pgEnum; the table adds
 * `check(...)` from `enumCheck()` so the database refuses anything outside the list.
 */
export function textEnum<const T extends readonly [string, ...string[]]>(name: string, values: T) {
  return { name, enumValues: values };
}
export type TextEnum = ReturnType<typeof textEnum<readonly [string, ...string[]]>>;

/** The column for an enum: `enumColumn("status", articleStatus)`. Add `enumCheck(t.status, articleStatus)` to the table's constraints. */
export function enumColumn<const T extends readonly [string, ...string[]]>(column: string, e: { enumValues: T }) {
  return text(column, { enum: e.enumValues });
}

/** SQL for the CHECK constraint that mirrors the enum. */
export function enumCheckSql(column: string, e: { enumValues: readonly string[] }) {
  return sql.raw(`"${column}" in (${e.enumValues.map((v) => `'${v}'`).join(", ")})`);
}

/** JSON stored as text; typed at the call site with `.$type<T>()`. */
export const json = (name: string) => text(name, { mode: "json" });

export const bool = (name: string) => integer(name, { mode: "boolean" });
