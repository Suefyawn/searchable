import { date, doublePrecision, index, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";

/** A named time series: petrol-price, usd-pkr, gold-24k-tola, sbp-policy-rate… */
export const dataSeries = pgTable("data_series", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  unit: text("unit").notNull(), // PKR, PKR/litre, %, PKR/tola
  frequency: text("frequency").notNull(), // daily | fortnightly | monthly | ad-hoc
  description: text("description"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const dataPoints = pgTable(
  "data_points",
  {
    id: id(),
    seriesId: text("series_id")
      .notNull()
      .references(() => dataSeries.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    value: doublePrecision("value").notNull(),
    note: text("note"),
    sourceUrl: text("source_url"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("data_points_series_date_idx").on(t.seriesId, t.date), index("data_points_series_idx").on(t.seriesId)],
);
