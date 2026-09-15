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
| data series (Phase 6) |: | `/data/[slug]` | 1.1 |

Two generated `tsvector` columns:

- `tsv`, weighted, English config: title + keywords (A), summary + category + city (B), body (C). GIN-indexed. Used for relevance.
- `tsv_simple`, unstemmed `simple` config over the short fields. Used for **prefix matching** so "electri" finds "electricity" and "sol" finds "solar".

**Write-through rule:** every create/update/delete of an article, business, location or entity calls the matching indexer in the same request. `npm run search:reindex` rebuilds from scratch.

## Query: `search()` in `src/lib/search.ts`

```
rank = greatest( ts_rank_cd(tsv, websearch_to_tsquery('english', q)),
                 ts_rank_cd(tsv_simple, prefix_query) × 0.7 )
       × boost
       × (1 + min(popularity, 1000) / 2000)          -- views, ratings, verification
       × freshness (news only: decays to 0.5 over 180 days)
```

- `websearch_to_tsquery` supports quotes, `OR`, and `-exclusions`.
- Prefix query = every word as `word:*`, ANDed.
- Filters: `types[]`, `city` (slug). Pagination via limit/offset; `total` via window count.
- `ts_headline` produces the highlighted snippet.
- Every search is logged to `search_queries` with its result count.

## Presentation (`/search`)

1. **Best match**, the top hit, whatever its type, in a highlighted card.
2. **Grouped sections** in intent order: Tools → Guides → Businesses → News → Places → Topics.
3. Type filter chips; city filter (Phase 4).

## Suggestions (`/api/suggest`)

Case-insensitive `LIKE` over title + keywords, ordered by boost then popularity, 8 results, 60s cache. Rendered in the search box with keyboard navigation.

## Roadmap for search intelligence (Phase 5)

- **Query understanding:** detect intent (tool / place / explainer / number / story), extract entities (from `entities.aliases`) and locations (from `locations`), and detect category words → apply type boosts and city filters automatically. "solar companies lahore" → `types=[business]`, `city=lahore`, category=solar-companies.
- **Synonyms:** expand with `search_synonyms` (bijli → electricity, sona → gold, wakeel → lawyer) and Roman-Urdu variants.
- **Typo tolerance:** `pg_trgm` similarity on titles as a third fallback.
- **Trending:** `search_queries` over the last 24h vs 7d.
- **Learning:** log clicks (`clicked_url`) and boost documents that win for a query.
- **Swap-out:** if Postgres FTS is measured insufficient, re-implement `search()` and `suggest()` against Typesense/Meilisearch; the write-through indexers and result shape stay identical.
