# Search

Search is the product. One index, one query, one ranking function, every entity type flows through it.

## Index: `search_documents`

Each searchable thing writes exactly one row (unique on `entity_type + entity_id`). Writers live in `src/lib/indexers.ts`:

| Entity | Indexer | URL | Boost |
|---|---|---|---|
| news article | `indexArticle` | `/news/[cat]/[slug]` | 1.0 × freshness |
| guide | `indexArticle` | `/guides/[cat]/[slug]` | 1.2 |
| tool | `indexTools` | `/tools/[cat]/[slug]` | 1.4 |
| business | `indexBusiness` | `/b/[slug]` | 1.0 |
| location | `indexLocation` | `/cities/[slug]` | 0.8 |
| entity | `indexEntity` | `/e/[slug]` | 0.9 |
| data series | `indexDataSeries` | `/data/[slug]` | 1.1 |
| professional | `indexProfessional` | `/p/[slug]` | 1.0 |
| static hubs (electricity, car prices, comparisons) | `indexStaticPages` | various | 1.3 |

Two FTS5 external-content tables over `search_documents` (`migrations/0001_search_fts.sql`, kept in step by triggers; ADR-45, docs/schema-notes.md):

- `search_fts` (unicode61, prefix indexes 2 and 3): title, keywords, summary, category, city, body. Used for relevance and snippets.
- `search_trgm` (trigram tokenizer): title + keywords. Used for typo tolerance and "did you mean".

**Write-through rule:** every create/update/delete of an article, business, location or entity calls the matching indexer in the same request. `npm run search:reindex` rebuilds from scratch through the admin API.

## Query: `search()` in `src/lib/search.ts`

1. `normalizeQuery` lower-cases and trims; `expandQuery` adds `search_synonyms` (bijli → electricity) as `(a OR b)` groups.
2. `toFtsQuery` (`src/lib/fts-query.ts`, pure, `tests/search-query.test.ts`) turns it into an FTS5 MATCH string, the equivalent of `websearch_to_tsquery` plus the old prefix vector:
   - every plain word is prefix-matched and the words are ANDed: `petrol price` → `"petrol"* AND "price"*`;
   - quotes are phrases, `(a OR b)` groups pass through, `-word` becomes `NOT "word"`;
   - a trailing plural s is dropped from longer words (the index is not stemmed);
   - hyphenated or dotted words are the AND of their parts, one-letter parts dropped (`usd-pkr` → `"usd"* AND "pkr"*`);
   - function words in English and Roman Urdu (`how to`, `the`, `ka`, `kya hai`) are dropped when a content word remains, because prefix-matched they hit "today" and "tola" and starve the AND.
3. Ranking:

```
rank = -bm25(search_fts, 10, 10, 4, 4, 4, 1)          -- title, keywords (A); summary, category, city (B); body (C)
       × boost
       × intent boost (detectIntent: tool, place, person, market, explainer, number, story)
       × (1 + min(popularity, 1000) / 2000)          -- views, ratings, verification
       × freshness (news only: decays to 0.5 over 180 days)
```

4. Fallbacks, in order, each only when the previous found too little:
   - **any word** (zero hits, first page): the same groups ORed, the page re-ordered by how many of the query's content words appear in title, keywords or summary, then by rank. `kesc duplicate bill` finds the K-Electric hub and the K-Electric guide first.
   - **typo tolerance** (fewer than three hits): `search_trgm` returns anything sharing a trigram with the query; candidates stay when `wordSimilarity` (per query word, the best trigram similarity to any title or keyword word, averaged; `src/lib/fuzzy.ts`) is 0.5 or more. `petrl price` finds the petrol and diesel series, `zakaat calculater` the Zakat calculator.
5. Filters: `types[]`, `city` (slug). Pagination via limit/offset; `total` via `count(*) over ()`. Facets per type on the first unfiltered page.
6. `snippet(search_fts, -1, …, 28)` produces the highlighted snippet; the markers are control characters swapped for `<mark>` after HTML escaping.
7. Every search is logged to `search_queries` with its result count; clicks update `clicked_url`.

Known limits: bm25 length normalisation lets a short hub page outrank a long article that matches the same words; `k-electric` loses its `k` (one-letter parts are dropped), so the hub carries `kesc` and `ke` as aliases (`src/content/discos.ts`). Representative queries and their expected top hits are checked by hand on staging after a ranking change: `ogra petrol`, `bijli bill`, `petrol price`, `gold rate today`, `usd to pkr`, `kse 100`, `zakat calculator`, `salary tax calculator 2026`, `solar companies lahore`, `marla to square feet`, `pak passport fee`, `jazz load tax calculator`, `kesc duplicate bill`, `petrl price`, `petrol ka rate kya hai` (the Semrush organic report for searchable.pk in the `pk` database supplies the demand side).

## Presentation (`/search`)

1. **Best match**, the top hit, whatever its type, in a highlighted card.
2. **Grouped sections** in intent order: Tools → Guides → Businesses → News → Places → Topics.
3. Type filter chips; city filter (Phase 4).

## Suggestions (`/api/suggest`)

`search_fts` prefix match over title + keywords, ordered by boost then popularity, 8 results, 60s cache. Rendered in the search box with keyboard navigation.

## Roadmap for search intelligence

- **Query understanding:** detect intent (tool / place / explainer / number / story), extract entities (from `entities.aliases`) and locations (from `locations`), and detect category words → apply type boosts and city filters automatically. "solar companies lahore" → `types=[business]`, `city=lahore`, category=solar-companies.
- **Synonyms:** expand with `search_synonyms` (bijli → electricity, sona → gold, wakeel → lawyer) and Roman-Urdu variants.
- **Trending:** `search_queries` over the last 24h vs 7d.
- **Learning:** log clicks (`clicked_url`) and boost documents that win for a query.
- **Swap-out:** if FTS5 is measured insufficient, re-implement `search()` and `suggest()` against Typesense/Meilisearch; the write-through indexers and result shape stay identical.
