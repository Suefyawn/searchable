import { index, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, id, json, updatedAt } from "./_shared";

/** A named time series: petrol-price, usd-pkr, gold-24k-tola, sbp-policy-rate… */
export const dataSeries = sqliteTable("data_series", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  unit: text("unit").notNull(), // PKR, PKR/litre, %, PKR/tola
  frequency: text("frequency").notNull(), // daily | fortnightly | monthly | ad-hoc
  description: text("description"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  meta: json("meta").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const dataPoints = sqliteTable(
  "data_points",
  {
    id: id(),
    seriesId: text("series_id")
      .notNull()
      .references(() => dataSeries.id, { onDelete: "cascade" }),
    /** ISO date, YYYY-MM-DD; compared and sorted as text. */
    date: text("date").notNull(),
    value: real("value").notNull(),
    note: text("note"),
    sourceUrl: text("source_url"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("data_points_series_date_idx").on(t.seriesId, t.date), index("data_points_series_idx").on(t.seriesId)],
);
