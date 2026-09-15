import { customType, text, timestamp } from "drizzle-orm/pg-core";

/** Text primary key with a random UUID default. Used everywhere so polymorphic refs share one type. */
export const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

/** Postgres tsvector — used by the federated search index. */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
