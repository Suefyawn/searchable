import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, rawQuery, schema } from "@/db";

export type SearchEntityType = (typeof schema.searchEntityType.enumValues)[number];

export type SearchDoc = {
  entityType: SearchEntityType;
  entityId: string;
  url: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  keywords?: string | null;
  category?: string | null;
  categorySlug?: string | null;
  city?: string | null;
  citySlug?: string | null;
  imageUrl?: string | null;
  boost?: number;
  popularity?: number;
  meta?: Record<string, unknown>;
  publishedAt?: Date | null;
};

/** Default rank multipliers per entity type. Tools and guides answer intent directly, so they lead. */
export const TYPE_BOOST: Record<SearchEntityType, number> = {
  tool: 1.4,
  guide: 1.2,
  news: 1.0,
  business: 1.0,
  entity: 0.9,
  location: 0.8,
  data_series: 1.1,
  comparison: 1.1,
};

export const TYPE_LABEL: Record<SearchEntityType, string> = {
  tool: "Tool",
  guide: "Guide",
  news: "News",
  business: "Business",
  entity: "Topic",
  location: "Place",
  data_series: "Data",
  comparison: "Compare",
};

/** Write-through: called by every mutation of a searchable entity. */
export async function syncSearchDocument(doc: SearchDoc) {
  const db = await getDb();
  const values = {
    ...doc,
    boost: doc.boost ?? TYPE_BOOST[doc.entityType],
    popularity: doc.popularity ?? 0,
    meta: doc.meta ?? {},
    body: doc.body ? doc.body.slice(0, 20_000) : null,
  };
  await db
    .insert(schema.searchDocuments)
    .values(values)
    .onConflictDoUpdate({
      target: [schema.searchDocuments.entityType, schema.searchDocuments.entityId],
      set: { ...values, updatedAt: new Date() },
    });
}

export async function removeSearchDocument(entityType: SearchEntityType, entityId: string) {
  const db = await getDb();
  await db.delete(schema.searchDocuments).where(and(eq(schema.searchDocuments.entityType, entityType), eq(schema.searchDocuments.entityId, entityId)));
}

export type SearchHit = {
  entityType: SearchEntityType;
  entityId: string;
  url: string;
  title: string;
  summary: string | null;
  category: string | null;
  city: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  rank: number;
  headline: string | null;
};

export type SearchOptions = { types?: SearchEntityType[]; city?: string; limit?: number; offset?: number };

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

/**
 * Federated search. Uses websearch_to_tsquery (supports quotes, OR, -) with a prefix-match fallback
 * so partial words like "electri" still hit "electricity".
 */
export async function search(query: string, opts: SearchOptions = {}): Promise<{ hits: SearchHit[]; total: number }> {
  const q = normalizeQuery(query);
  if (!q) return { hits: [], total: 0 };
  const db = await getDb();
  const limit = Math.min(opts.limit ?? 20, 50);
  const offset = opts.offset ?? 0;

  // Build a prefix tsquery from the words for the fallback: "income tax" → 'income':* & 'tax':*
  const words = q.split(" ").filter((w) => w.length > 1).slice(0, 8);
  const prefixQuery = words.map((w) => `${w.replace(/[^a-z0-9؀-ۿ]/g, "")}:*`).filter((w) => w !== ":*").join(" & ");

  const typeFilter = opts.types?.length ? sql`and entity_type in (${sql.join(opts.types.map((t) => sql`${t}`), sql`, `)})` : sql``;
  const cityFilter = opts.city ? sql`and city_slug = ${opts.city}` : sql``;

  const list = await rawQuery<Record<string, unknown> & { total: number }>(db, sql`
    with q as (
      select websearch_to_tsquery('english', ${q}) as ws,
             ${prefixQuery ? sql`to_tsquery('simple', ${prefixQuery})` : sql`null::tsquery`} as pq
    ),
    matched as (
      select d.entity_type, d.entity_id, d.url, d.title, d.summary, d.category, d.city, d.image_url, d.published_at,
             (
               greatest(
                 ts_rank_cd(d.tsv, q.ws, 32),
                 case when q.pq is not null then ts_rank_cd(d.tsv_simple, q.pq, 32) * 0.7 else 0 end
               )
               * d.boost
               * (1 + least(d.popularity, 1000) / 2000.0)
               * case when d.entity_type = 'news' and d.published_at is not null
                      then greatest(0.5, 1 - extract(epoch from (now() - d.published_at)) / (86400.0 * 180))
                      else 1 end
             ) as rank,
             ts_headline('english', coalesce(d.summary, left(d.body, 600), ''), q.ws,
                         'MaxWords=28, MinWords=14, StartSel=<mark>, StopSel=</mark>, MaxFragments=1') as headline
      from search_documents d, q
      where (d.tsv @@ q.ws or (q.pq is not null and d.tsv_simple @@ q.pq))
      ${typeFilter}
      ${cityFilter}
    )
    select *, count(*) over() as total
    from matched
    order by rank desc, published_at desc nulls last
    limit ${limit} offset ${offset}
  `);

  const hits: SearchHit[] = list.map((r) => ({
    entityType: r.entity_type as SearchEntityType,
    entityId: r.entity_id as string,
    url: r.url as string,
    title: r.title as string,
    summary: (r.summary as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    city: (r.city as string | null) ?? null,
    imageUrl: (r.image_url as string | null) ?? null,
    publishedAt: r.published_at ? new Date(r.published_at as string) : null,
    rank: Number(r.rank),
    headline: (r.headline as string | null) ?? null,
  }));
  return { hits, total: list.length ? Number(list[0].total) : 0 };
}

/** Group hits by type for the "best answer per kind" layout. */
export function groupHits(hits: SearchHit[]) {
  const groups = new Map<SearchEntityType, SearchHit[]>();
  for (const h of hits) {
    if (!groups.has(h.entityType)) groups.set(h.entityType, []);
    groups.get(h.entityType)!.push(h);
  }
  return groups;
}

export async function suggest(query: string, limit = 8): Promise<Pick<SearchHit, "entityType" | "url" | "title" | "category" | "city">[]> {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  const db = await getDb();
  const rows = await db
    .select({
      entityType: schema.searchDocuments.entityType,
      url: schema.searchDocuments.url,
      title: schema.searchDocuments.title,
      category: schema.searchDocuments.category,
      city: schema.searchDocuments.city,
    })
    .from(schema.searchDocuments)
    .where(sql`lower(${schema.searchDocuments.title}) like ${"%" + q + "%"} or lower(coalesce(${schema.searchDocuments.keywords}, '')) like ${"%" + q + "%"}`)
    .orderBy(desc(schema.searchDocuments.boost), desc(schema.searchDocuments.popularity))
    .limit(limit);
  return rows;
}

export async function logSearch(query: string, resultCount: number, sessionId?: string) {
  const db = await getDb();
  const normalized = normalizeQuery(query);
  if (!normalized) return;
  await db.insert(schema.searchQueries).values({ query: query.slice(0, 200), normalized, resultCount, sessionId });
}

export async function popularSearches(limit = 8): Promise<{ query: string; count: number }[]> {
  const db = await getDb();
  return rawQuery<{ query: string; count: number }>(
    db,
    sql`select normalized as query, count(*)::int as count
        from search_queries
        where created_at > now() - interval '30 days' and result_count > 0
        group by normalized order by count desc limit ${limit}`,
  );
}
