import { check, index, integer, real, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { createdAt, enumCheckSql, enumColumn, id, textEnum, updatedAt } from "./_shared";

export const locationKind = textEnum("location_kind", ["country", "province", "city", "area"]);

/** Pakistan as a tree: country → province → city → area. */
export const locations = sqliteTable(
  "locations",
  {
    id: id(),
    parentId: text("parent_id").references((): AnySQLiteColumn => locations.id, { onDelete: "set null" }),
    kind: enumColumn("kind", locationKind).notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    nameUrdu: text("name_urdu"),
    imageUrl: text("image_url"),
    imageCredit: text("image_credit"),
    /** Denormalised for fast lookups: the city this row belongs to (itself for cities). */
    cityId: text("city_id"),
    provinceId: text("province_id"),
    lat: real("lat"),
    lng: real("lng"),
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
    check("locations_kind_check", enumCheckSql("kind", locationKind)),
  ],
);
