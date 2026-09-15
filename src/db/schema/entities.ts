import { index, jsonb, pgEnum, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";

export const entityKind = pgEnum("entity_kind", [
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

export const entityLinkTarget = pgEnum("entity_link_target", ["article", "tool", "business", "location", "data_series", "comparison"]);

/** Knowledge-graph nodes. Anything that deserves a hub page at /e/[slug]. */
export const entities = pgTable(
  "entities",
  {
    id: id(),
    kind: entityKind("kind").notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameUrdu: text("name_urdu"),
    aliases: jsonb("aliases").$type<string[]>().default([]).notNull(),
    description: text("description"),
    website: text("website"),
    logoUrl: text("logo_url"),
    /** Free-form structured facts shown on the hub (founded, headquarters, regulator…). */
    facts: jsonb("facts").$type<Record<string, string>>().default({}).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("entities_kind_idx").on(t.kind)],
);

export const entityLinks = pgTable(
  "entity_links",
  {
    id: id(),
    entityId: text("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    targetType: entityLinkTarget("target_type").notNull(),
    targetId: text("target_id").notNull(),
    relation: text("relation").default("mentions").notNull(), // mentions | about | operated_by | sells …
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("entity_links_unique_idx").on(t.entityId, t.targetType, t.targetId),
    index("entity_links_target_idx").on(t.targetType, t.targetId),
  ],
);
