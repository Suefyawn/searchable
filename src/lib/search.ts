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

/**
 * Query intent → per-type rank multipliers (blended on top of TYPE_BOOST). Cheap keyword rules; the log
 * of zero-result and low-click queries in /admin/search-log is where new rules come from.
 */
export type Intent = "tool" | "place" | "explainer" | "number" | "story" | "general";

const INTENT_RULES: { intent: Intent; re: RegExp }[] = [
  { intent: "tool", re: /\b(calculat|calculator|convert|converter|kitna|kitni|how much|tax on|emi|instal?ment|zakat on|salary of|take.?home)\b/i },
  { intent: "place", re: /\b(near me|nearby|in (karachi|lahore|islamabad|rawalpindi|faisalabad|multan|peshawar|quetta|hyderabad|gujranwala|sialkot)|restaurants?|hospitals?|doctors?|dentists?|lawyers?|schools?|gyms?|salons?|hotels?|dealers?|workshops?|companies|installers?|shops?|contact|phone number|address)\b/i },
  { intent: "explainer", re: /\b(how to|how do|kaise|kese|tarika|process|procedure|register|apply|renew|check status|requirements?|documents?|guide|step)\b/i },
  { intent: "number", re: /\b(rate|rates|price|prices|today|aaj|history|chart|kibor|inflation|per tola|per litre|exchange)\b/i },
  { intent: "story", re: /\b(news|latest|update|announce|budget|nepra|ecc|cabinet|why|when will)\b/i },
];

export function detectIntent(q: string): Intent {
  for (const r of INTENT_RULES) if (r.re.test(q)) return r.intent;
  return "general";
}

const INTENT_BOOST: Record<Intent, Partial<Record<SearchEntityType, number>>> = {
  tool: { tool: 1.6, guide: 1.1, data_series: 1.1 },
  place: { business: 1.8, location: 1.4, tool: 0.7, news: 0.7 },
  explainer: { guide: 1.6, tool: 1.1, news: 0.8 },
  number: { data_series: 1.8, tool: 1.2, news: 0.9 },
  story: { news: 1.6, entity: 1.1, tool: 0.8 },
  general: {},
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
  /** Matched by trigram similarity rather than full text (typo tolerance). */
  fuzzy?: boolean;
};

export type SearchOptions = { types?: SearchEntityType[]; city?: string; limit?: number; offset?: number };

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

let synonymCache: { at: number; map: Map<string, string[]> } | null = null;

/** term → synonyms, cached for 5 minutes. Seeded with Roman-Urdu ↔ English pairs (bijli → electricity). */
async function synonymMap(): Promise<Map<string, string[]>> {
  if (synonymCache && Date.now() - synonymCache.at < 300_000) return synonymCache.map;
  const db = await getDb();
  const rows = await db.select().from(schema.searchSynonyms);
  const map = new Map<string, string[]>();
  for (const r of rows) {
    map.set(r.term.toLowerCase(), r.synonyms);
    // reverse direction: each synonym also expands back to the term
    for (const syn of r.synonyms) {
      const key = syn.toLowerCase();
      map.set(key, Array.from(new Set([...(map.get(key) ?? []), r.term, ...r.synonyms.filter((x) => x !== syn)])));
    }
  }
  synonymCache = { at: Date.now(), map };
  return map;
}

/** "bijli bill" → "(bijli OR electricity OR power OR wapda) bill" for websearch_to_tsquery. */
export async function expandQuery(q: string): Promise<string> {
  const map = await synonymMap();
  if (!map.size) return q;
  return q
    .split(" ")
    .map((w) => {
      const syns = map.get(w.replace(/[^a-z0-9؀-ۿ]/g, ""));
      return syns?.length ? `(${[w, ...syns].join(" OR ")})` : w;
    })
    .join(" ");
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

  const expanded = await expandQuery(q);
  const intent = detectIntent(q);
  const intentCase = sql.join(
    Object.entries(INTENT_BOOST[intent]).map(([t, m]) => sql`when ${t} then ${m}::float`),
    sql` `,
  );
  const intentBoost = Object.keys(INTENT_BOOST[intent]).length ? sql`case d.entity_type::text ${intentCase} else 1.0 end` : sql`1`;
  const typeFilter = opts.types?.length ? sql`and entity_type in (${sql.join(opts.types.map((t) => sql`${t}`), sql`, `)})` : sql``;
  const cityFilter = opts.city ? sql`and city_slug = ${opts.city}` : sql``;

  const list = await rawQuery<Record<string, unknown> & { total: number }>(db, sql`
    with q as (
      select websearch_to_tsquery('english', ${expanded}) as ws,
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
               * ${intentBoost}
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
  if (list.length >= 3 || offset > 0) return { hits, total: list.length ? Number(list[0].total) : 0 };

  // Typo tolerance: too few full-text hits → trigram similarity on title/keywords ("electrcity bill" → electricity).
  const fuzzy = await rawQuery<Record<string, unknown>>(db, sql`
    select d.entity_type, d.entity_id, d.url, d.title, d.summary, d.category, d.city, d.image_url, d.published_at,
           greatest(similarity(d.title, ${q}), similarity(coalesce(d.keywords, ''), ${q}) * 0.9) * d.boost * ${intentBoost} as rank
    from search_documents d
    where (similarity(d.title, ${q}) > 0.25 or similarity(coalesce(d.keywords, ''), ${q}) > 0.2)
    ${typeFilter}
    ${cityFilter}
    order by rank desc
    limit ${limit}
  `);
  const seen = new Set(hits.map((h) => h.entityId));
  for (const r of fuzzy) {
    if (seen.has(r.entity_id as string)) continue;
    hits.push({
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
      headline: null,
      fuzzy: true,
    });
  }
  return { hits, total: hits.length };
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
    .where(sql`lower(${schema.searchDocuments.title}) like ${"%" + q + "%"} or lower(coalesce(${schema.searchDocuments.keywords}, '')) like ${"%" + q + "%"} or similarity(${schema.searchDocuments.title}, ${q}) > 0.3`)
    .orderBy(sql`case when lower(${schema.searchDocuments.title}) like ${"%" + q + "%"} then 0 else 1 end`, desc(schema.searchDocuments.boost), desc(schema.searchDocuments.popularity))
    .limit(limit);
  return rows;
}

export async function logSearch(query: string, resultCount: number, sessionId?: string) {
  const db = await getDb();
  const normalized = normalizeQuery(query);
  if (!normalized) return;
  await db.insert(schema.searchQueries).values({ query: query.slice(0, 200), normalized, resultCount, sessionId });
}

/** Queries rising in the last 24h vs the prior week. */
export async function trendingSearches(limit = 6): Promise<{ query: string; count: number }[]> {
  const db = await getDb();
  return rawQuery<{ query: string; count: number }>(
    db,
    sql`with recent as (select normalized, count(*)::int as n from search_queries where created_at > now() - interval '1 day' and result_count > 0 group by normalized),
             prior as (select normalized, count(*)::float / 7 as n from search_queries where created_at between now() - interval '8 days' and now() - interval '1 day' group by normalized)
        select recent.normalized as query, recent.n as count
        from recent left join prior on prior.normalized = recent.normalized
        where recent.n >= 2 and recent.n > coalesce(prior.n, 0) * 1.5
        order by recent.n desc limit ${limit}`,
  );
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
