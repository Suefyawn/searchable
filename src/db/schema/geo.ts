import { doublePrecision, index, integer, pgEnum, pgTable, text, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";

export const locationKind = pgEnum("location_kind", ["country", "province", "city", "area"]);

/** Pakistan as a tree: country → province → city → area. */
export const locations = pgTable(
  "locations",
  {
    id: id(),
    parentId: text("parent_id").references((): AnyPgColumn => locations.id, { onDelete: "set null" }),
    kind: locationKind("kind").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    nameUrdu: text("name_urdu"),
    /** Denormalised for fast lookups: the city this row belongs to (itself for cities). */
    cityId: text("city_id"),
    provinceId: text("province_id"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    population: integer("population"),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("locations_kind_slug_idx").on(t.kind, t.slug),
    index("locations_parent_idx").on(t.parentId),
    index("locations_city_idx").on(t.cityId),
  ],
);
