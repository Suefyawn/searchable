import { check, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, enumCheckSql, enumColumn, id, json, textEnum, updatedAt } from "./_shared";

export const entityKind = textEnum("entity_kind", [
  "organization", // FBR, NADRA, PTA, SBP, K-Electric
  "company", // Toyota, Meezan Bank, Jazz
  "brand", // Apple, Samsung
  "product", // iPhone 17, Corolla
  "person",
  "place", // mirrors a location row when it deserves a hub
  "commodity", // Gold, Petrol
  "currency", // USD/PKR
  "topic", // Income Tax, Solar Energy
]);

export const entityLinkTarget = textEnum("entity_link_target", ["article", "tool", "business", "location", "data_series", "comparison"]);

/** Knowledge-graph nodes. Anything that deserves a hub page at /e/[slug]. */
export const entities = sqliteTable(
  "entities",
  {
    id: id(),
    kind: enumColumn("kind", entityKind).notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameUrdu: text("name_urdu"),
    aliases: json("aliases").$type<string[]>().default([]).notNull(),
    description: text("description"),
    website: text("website"),
    logoUrl: text("logo_url"),
    /** Free-form structured facts shown on the hub (founded, headquarters, regulator…). */
    facts: json("facts").$type<Record<string, string>>().default({}).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("entities_kind_idx").on(t.kind), check("entities_kind_check", enumCheckSql("kind", entityKind))],
);

export const entityLinks = sqliteTable(
  "entity_links",
  {
    id: id(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    targetType: enumColumn("target_type", entityLinkTarget).notNull(),
    targetId: text("target_id").notNull(),
    relation: text("relation").default("mentions").notNull(), // mentions | about | operated_by | sells …
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("entity_links_unique_idx").on(t.entityId, t.targetType, t.targetId),
    index("entity_links_target_idx").on(t.targetType, t.targetId),
    check("entity_links_target_type_check", enumCheckSql("target_type", entityLinkTarget)),
  ],
);
