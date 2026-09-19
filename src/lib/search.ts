import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, rawQuery, rawRun, schema } from "@/db";
import { contentWords, toFtsQuery } from "@/lib/fts-query";
import { shareWord, trigramMatch, trigramSimilarity, wordSimilarity } from "@/lib/fuzzy";

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
  professional: 1.0,
  post: 0.9,
};

/**
 * Query intent → per-type rank multipliers (blended on top of TYPE_BOOST). Cheap keyword rules; the log
 * of zero-result and low-click queries in /admin/search-log is where new rules come from.
 */
export type Intent = "tool" | "place" | "person" | "market" | "explainer" | "number" | "story" | "general";

const INTENT_RULES: { intent: Intent; re: RegExp }[] = [
  { intent: "tool", re: /\b(calculat|calculator|convert|converter|kitna|kitni|how much|tax on|emi|instal?ment|zakat on|salary of|take.?home)\b/i },
  { intent: "place", re: /\b(near me|nearby|in (karachi|lahore|islamabad|rawalpindi|faisalabad|multan|peshawar|quetta|hyderabad|gujranwala|sialkot)|restaurants?|hospitals?|schools?|gyms?|salons?|hotels?|dealers?|workshops?|companies|installers?|shops?|contact|phone number|address)\b/i },
  { intent: "person", re: /\b(doctors?|dentists?|lawyers?|advocates?|electricians?|plumbers?|engineers?|architects?|tutors?|teachers?|physio|psychologists?|accountants?|consultants?|designers?|photographers?|mechanics?|technicians?|freelancers?|hire|book an? appointment|dr\.?)\b/i },
  { intent: "market", re: /\b(jobs?|vacanc(y|ies)|hiring|for sale|sell|buy|olx|second.?hand|used|auction|bid|rent|wanted)\b/i },
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
  place: { business: 1.8, location: 1.4, professional: 1.3, tool: 0.7, news: 0.7 },
  person: { professional: 1.9, business: 1.3, guide: 0.9, news: 0.7 },
  explainer: { guide: 1.6, tool: 1.1, news: 0.8 },
  number: { data_series: 1.8, tool: 1.2, news: 0.9 },
  story: { news: 1.6, entity: 1.1, tool: 0.8 },
  market: { post: 1.9, business: 1.1, news: 0.8 },
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
  // The FTS tables follow through triggers (migrations/0001_search_fts.sql), so nothing else to do here.
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
  /** Per-type extras: data series carry { latest, unit, slug }; tools { slug }; businesses rating and phone. */
  meta: Record<string, unknown>;
  /** Matched by trigram similarity rather than full text (typo tolerance). */
  fuzzy?: boolean;
};

export type SearchOptions = { types?: SearchEntityType[]; city?: string; limit?: number; offset?: number; sort?: "relevance" | "newest" };
export type SearchResult = { hits: SearchHit[]; total: number; facets: Partial<Record<SearchEntityType, number>>; intent: Intent };

const DAY = 86_400_000;

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

/** "bijli bill" → "(bijli OR electricity OR power OR wapda) bill", which toFtsQuery turns into FTS5 syntax. */
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

/** A row of search_documents as the ranking queries return it, plus rank and headline. */
type Row = Record<string, unknown> & { rank: number; total?: number; headline?: string | null };

function toHit(r: Row, fuzzy = false): SearchHit {
  return {
    entityType: r.entity_type as SearchEntityType,
    entityId: r.entity_id as string,
    url: r.url as string,
    title: r.title as string,
    summary: (r.summary as string | null) ?? null,
    category: (r.category as string | null) ?? null,
    city: (r.city as string | null) ?? null,
    imageUrl: (r.image_url as string | null) ?? null,
    publishedAt: r.published_at ? new Date(Number(r.published_at)) : null,
    rank: Number(r.rank),
    headline: fuzzy ? null : escapeHeadline((r.headline as string | null) ?? null),
    meta: typeof r.meta === "string" ? (JSON.parse(r.meta) as Record<string, unknown>) : ((r.meta as Record<string, unknown> | null) ?? {}),
    ...(fuzzy ? { fuzzy: true } : {}),
  };
}

/** snippet() marks matches with control characters; the text is escaped and only those become <mark>. */
const MARK_OPEN = "\u0001";
const MARK_CLOSE = "\u0002";
function escapeHeadline(h: string | null): string | null {
  if (!h) return null;
  return h.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replaceAll(MARK_OPEN, "<mark>").replaceAll(MARK_CLOSE, "</mark>");
}

/** bm25 weights per FTS column: title, keywords (A), summary, category, city (B), body (C). */
const BM25 = sql`bm25(search_fts, 10, 10, 4, 4, 4, 1)`;

/**
 * Federated search over the FTS5 index (docs/schema-notes.md). Quotes, OR and -exclusions come through
 * toFtsQuery; every plain word is prefix-matched so "electri" still finds electricity.
 */
export async function search(query: string, opts: SearchOptions = {}): Promise<SearchResult> {
  const q = normalizeQuery(query);
  if (!q) return { hits: [], total: 0, facets: {}, intent: "general" };
  const db = await getDb();
  const limit = Math.min(opts.limit ?? 20, 50);
  const offset = opts.offset ?? 0;
  const intent = detectIntent(q);
  const now = Date.now();

  const intentEntries = Object.entries(INTENT_BOOST[intent]);
  const intentBoost = intentEntries.length ? sql`case d.entity_type ${sql.join(intentEntries.map(([t, m]) => sql`when ${t} then ${m}`), sql` `)} else 1.0 end` : sql`1.0`;
  const typeFilter = opts.types?.length ? sql`and d.entity_type in (${sql.join(opts.types.map((t) => sql`${t}`), sql`, `)})` : sql``;
  const cityFilter = opts.city ? sql`and d.city_slug = ${opts.city}` : sql``;
  const order = opts.sort === "newest" ? sql`d.published_at desc nulls last, rank desc` : sql`rank desc, d.published_at desc nulls last`;
  // -bm25 is positive and larger for better matches; the rest are the same multipliers the Postgres query used.
  const rank = sql`(-m.score) * d.boost * ${intentBoost} * (1 + min(d.popularity, 1000) / 2000.0)
      * case when d.entity_type = 'news' and d.published_at is not null then max(0.5, 1 - (${now} - d.published_at) / (86400000.0 * 180)) else 1 end`;

  const expanded = await expandQuery(q);
  let hits: SearchHit[] = [];
  let total = 0;
  const facets: SearchResult["facets"] = {};
  const run = async (fts: string, any = false) => {
    const facetsPromise =
      !opts.types?.length && offset === 0
        ? rawQuery<{ entity_type: SearchEntityType; n: number }>(db, sql`
            select d.entity_type, count(*) as n
            from search_fts f join search_documents d on d.seq = f.rowid
            where search_fts match ${fts} ${cityFilter}
            group by d.entity_type`)
        : Promise.resolve([]);
    const listPromise = rawQuery<Row>(db, sql`
      with m as (
        select rowid, ${BM25} as score, snippet(search_fts, -1, ${MARK_OPEN}, ${MARK_CLOSE}, '…', 28) as headline
        from search_fts where search_fts match ${fts}
      )
      select d.entity_type, d.entity_id, d.url, d.title, d.keywords, d.summary, d.category, d.city, d.image_url, d.published_at, d.meta,
             m.headline, ${rank} as rank, count(*) over () as total
      from m join search_documents d on d.seq = m.rowid
      where 1 = 1 ${typeFilter} ${cityFilter}
      order by ${order}
      limit ${limit} offset ${offset}`);
    const [list, facetRows] = await Promise.all([listPromise, facetsPromise]);
    for (const f of facetRows) facets[f.entity_type] = Number(f.n);
    if (any) {
      // bm25 over an OR does not prefer a document holding two of three words over one holding one word many
      // times, so order this page by how many of the query's words appear in title, keywords or summary first.
      const words = contentWords(q);
      const matched = (r: Row) => {
        const tokens = `${r.title} ${r.keywords ?? ""} ${r.summary ?? ""}`.toLowerCase().split(/[^a-z0-9؀-ۿ]+/);
        return words.filter((w) => tokens.some((t) => t.startsWith(w))).length;
      };
      list.sort((a, b) => matched(b) - matched(a) || Number(b.rank) - Number(a.rank));
    }
    hits = list.map((r) => toHit(r));
    total = list.length ? Number(list[0].total) : 0;
  };
  const fts = toFtsQuery(expanded);
  if (fts) await run(fts);
  // Nothing has every word ("kesc duplicate bill" spans the utility entity and the bill guide): take anything with
  // any of them, still ranked by bm25 so documents matching more words come first.
  if (!hits.length && offset === 0) {
    const any = toFtsQuery(expanded, { any: true });
    if (any) await run(any, true);
  }
  if (hits.length >= 3 || offset > 0) return { hits, total, facets, intent };

  // Typo tolerance: too few full-text hits, so ask the trigram index for anything sharing trigrams with the query and
  // keep candidates whose words are close to the query's words (wordSimilarity 0.5 or more on title or keywords).
  const match = trigramMatch(q);
  if (!match) return { hits, total, facets, intent };
  const candidates = await rawQuery<Row>(db, sql`
    select d.entity_type, d.entity_id, d.url, d.title, d.keywords, d.summary, d.category, d.city, d.image_url, d.published_at, d.meta,
           d.boost * ${intentBoost} as rank
    from search_trgm t join search_documents d on d.seq = t.rowid
    where search_trgm match ${match} ${typeFilter} ${cityFilter}
    order by bm25(search_trgm) limit 40`);
  const seen = new Set(hits.map((h) => h.entityId));
  const fuzzy = candidates
    .map((r) => ({ r, sim: Math.max(wordSimilarity(String(r.title), q), wordSimilarity(String(r.keywords ?? ""), q) * 0.9) }))
    .filter(({ r, sim }) => sim >= 0.5 && !seen.has(r.entity_id as string))
    .sort((a, b) => b.sim * Number(b.r.rank) - a.sim * Number(a.r.rank))
    .slice(0, limit);
  for (const { r, sim } of fuzzy) {
    hits.push(toHit({ ...r, rank: sim * Number(r.rank) }, true));
    facets[r.entity_type as SearchEntityType] = (facets[r.entity_type as SearchEntityType] ?? 0) + 1;
  }
  return { hits, total: hits.length, facets, intent };
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

export type Suggestion = Pick<SearchHit, "entityType" | "url" | "title" | "category" | "city"> & { meta?: Record<string, unknown> | null };

export async function suggest(query: string, limit = 8): Promise<Suggestion[]> {
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
      meta: schema.searchDocuments.meta,
    })
    .from(schema.searchDocuments)
    .where(sql`lower(${schema.searchDocuments.title}) like ${"%" + q + "%"} or lower(coalesce(${schema.searchDocuments.keywords}, '')) like ${"%" + q + "%"}`)
    .orderBy(sql`case when lower(${schema.searchDocuments.title}) like ${"%" + q + "%"} then 0 else 1 end`, desc(schema.searchDocuments.boost), desc(schema.searchDocuments.popularity))
    .limit(limit);
  return rows;
}

export async function logSearch(query: string, resultCount: number, sessionId?: string) {
  const db = await getDb();
  const normalized = normalizeQuery(query);
  if (!normalized) return;
  // Crawlers hit the SearchAction template literally; that is not a reader's question.
  if (/search_term_string|\{[a-z_]+\}/i.test(query)) return;
  await db.insert(schema.searchQueries).values({ query: query.slice(0, 200), normalized, resultCount, sessionId });
}

/** Queries rising in the last 24h vs the prior week. */
export async function trendingSearches(limit = 6): Promise<{ query: string; count: number }[]> {
  const db = await getDb();
  return rawQuery<{ query: string; count: number }>(
    db,
    sql`with recent as (select normalized, count(*) as n from search_queries where created_at > ${Date.now() - DAY} and result_count > 0 group by normalized),
             prior as (select normalized, count(*) * 1.0 / 7 as n from search_queries where created_at between ${Date.now() - 8 * DAY} and ${Date.now() - DAY} group by normalized)
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
    sql`select normalized as query, count(*) as count
        from search_queries
        where created_at > ${Date.now() - 30 * DAY} and result_count > 0
        group by normalized order by count desc limit ${limit}`,
  );
}

/** A logged query (or an indexed title) within typo distance of `q` that does return results. */
export async function didYouMean(query: string): Promise<string | null> {
  const q = normalizeQuery(query);
  if (q.length < 3) return null;
  const db = await getDb();
  // Logged queries first (a few hundred distinct ones at most), scored in JS the way pg_trgm scored them.
  const logged = await rawQuery<{ s: string; n: number }>(db, sql`select normalized as s, count(*) as n from search_queries where result_count > 0 and normalized <> ${q} group by normalized order by n desc limit 500`);
  const best = logged.map((r) => ({ s: r.s, sim: trigramSimilarity(r.s, q), n: Number(r.n) })).filter((x) => x.sim > 0.45).sort((a, b) => b.sim - a.sim || b.n - a.n)[0];
  if (best) return best.s;
  const match = trigramMatch(q);
  if (!match) return null;
  const titles = await rawQuery<{ s: string; boost: number }>(db, sql`select d.title as s, d.boost from search_trgm t join search_documents d on d.seq = t.rowid where search_trgm match ${match} order by bm25(search_trgm) limit 40`);
  const title = titles.map((r) => ({ s: r.s, sim: trigramSimilarity(r.s.toLowerCase(), q), boost: Number(r.boost) })).filter((x) => x.sim > 0.35).sort((a, b) => b.sim - a.sim || b.boost - a.boost)[0];
  return title?.s ?? null;
}

/** Other things people searched that share a word with `q` and found something. */
export async function relatedSearches(query: string, limit = 6): Promise<string[]> {
  const q = normalizeQuery(query);
  if (!q) return [];
  const db = await getDb();
  const rows = await rawQuery<{ s: string }>(
    db,
    sql`select normalized as s from search_queries
        where created_at > ${Date.now() - 90 * DAY} and result_count > 0 and normalized <> ${q}
        group by normalized order by count(*) desc, length(normalized) asc limit 500`,
  );
  return rows
    .map((r) => r.s)
    .filter((s) => shareWord(s, q) || trigramSimilarity(s, q) >= 0.3)
    .slice(0, limit);
}

/**
 * Compact index of the evergreen entries (tools, guides, data, places, topics) for instant client-side
 * suggestions. Served once from /suggest-index.json and cached by the CDN, so typing costs no function calls.
 */
export type SuggestIndexEntry = { t: string; u: string; k: string; y: SearchEntityType; c?: string; m?: string };
export async function suggestIndex(): Promise<{ entries: SuggestIndexEntry[]; popular: string[] }> {
  const db = await getDb();
  const rows = await db
    .select({ entityType: schema.searchDocuments.entityType, url: schema.searchDocuments.url, title: schema.searchDocuments.title, keywords: schema.searchDocuments.keywords, category: schema.searchDocuments.category, city: schema.searchDocuments.city, meta: schema.searchDocuments.meta, boost: schema.searchDocuments.boost, popularity: schema.searchDocuments.popularity })
    .from(schema.searchDocuments)
    .where(sql`entity_type in ('tool', 'guide', 'data_series', 'location', 'entity', 'comparison')`)
    .orderBy(desc(schema.searchDocuments.boost), desc(schema.searchDocuments.popularity))
    .limit(600);
  const entries = rows.map((r) => {
    const latest = (r.meta as { latest?: { value?: number }; unit?: string } | null)?.latest;
    const unit = (r.meta as { unit?: string } | null)?.unit;
    const m = latest && typeof latest.value === "number" ? (unit === "%" ? `${latest.value.toFixed(2)}%` : latest.value.toLocaleString("en-PK", { maximumFractionDigits: Number.isInteger(latest.value) ? 0 : 2 })) : undefined;
    return { t: r.title, u: r.url, k: (r.keywords ?? "").toLowerCase().slice(0, 240), y: r.entityType, c: r.city ?? r.category ?? undefined, m };
  });
  const popular = (await popularSearches(8)).map((p) => p.query);
  return { entries, popular };
}

/** Marks the most recent log row for this query with the URL the person chose. */
export async function recordSearchClick(query: string, url: string) {
  const normalized = normalizeQuery(query);
  if (!normalized || !url.startsWith("/")) return;
  const db = await getDb();
  await rawRun(
    db,
    sql`update search_queries set clicked_url = ${url.slice(0, 300)}
        where id = (select id from search_queries where normalized = ${normalized} and created_at > ${Date.now() - 3_600_000} order by created_at desc limit 1)`,
  );
}
