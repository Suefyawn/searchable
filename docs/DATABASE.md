# Database

Postgres, managed by Drizzle. Schema lives in `src/db/schema/*.ts`; generated SQL in `drizzle/`. All primary keys are `text` UUIDs so polymorphic references (`entity_links`, `search_documents`) share one type. Timestamps are `timestamptz`.

```
src/db/schema/
  auth.ts        users · sessions · accounts · verifications        (better-auth)
  geo.ts         locations                                          (country → province → city → area)
  content.ts     categories · authors · articles · tags · article_tags · article_revisions
  tools.ts       tools · tool_runs
  directory.ts   business_categories · businesses · business_category_links · business_hours
                 business_services · business_photos · business_reviews · business_claims · business_leads
  entities.ts    entities · entity_links
  data.ts        data_series · data_points
  newsletter.ts  newsletter_subscribers · newsletter_issues
  search.ts      search_documents · search_queries · search_synonyms
  platform.ts    redirects · media · analytics_events · settings
  relations.ts   Drizzle relations for the query API
```

## Identity
| Table | Purpose |
|---|---|
| `users` | better-auth user + `role` enum (`user`, `business_owner`, `editor`, `admin`) |
| `sessions`, `accounts`, `verifications` | better-auth internals (sessions in DB, password hash in `accounts.password`) |

## Geography
`locations(id, parent_id, kind, slug, name, name_urdu, city_id, province_id, lat, lng, population)`, one tree. `city_id`/`province_id` are denormalised for fast filtering. Unique on `(kind, slug)`.

## Content
- `categories(kind, slug, name)`, scoped by article kind so `/news/technology` and `/guides/technology` coexist.
- `articles`, `kind` (news | guide | explainer | page), `status` workflow (draft → research → editing → fact_check → scheduled → published → archived), Markdown `body`, `dek`, `excerpt`, `sources[]` and `faqs[]` as JSONB, SEO overrides, `noindex`, `is_featured`, `location_id` for a local angle, view counter, `published_at`, `last_reviewed_at`. Unique on `(kind, slug)`.
- `article_revisions`, snapshot on every publish (auditable corrections).
- `authors`, display identity, optionally linked to a user.

## Tools
- `tools`, metadata mirrored from the code registry (`src/tools/registry.ts`) by the seed/indexer; `run_count`, `last_reviewed_at`, `version`.
- `tool_runs`, anonymous inputs per run, for product decisions (which tools, which ranges).

## Directory
- `business_categories`, tree (parent_id), `name`, `name_plural`, `icon`.
- `businesses`, NAP, WhatsApp, website, socials, geo, `status` (pending | active | closed | rejected | duplicate), `tier` (free | verified | premium | sponsored), rating aggregates, `is_verified` + dates, `owner_user_id`.
- `business_category_links`, many-to-many (primary category also stored on the business).
- `business_hours`, one row per weekday (`opens`/`closes` as "HH:MM").
- `business_services`, `business_photos`, owner-managed.
- `business_reviews`, with moderation `status` and `owner_response`.
- `business_claims`, user ↔ business ownership requests with review trail.
- `business_leads`, enquiries from profile/category pages.

## Knowledge graph
- `entities(kind, slug, name, name_urdu, aliases[], description, website, facts{})`, FBR, NADRA, Toyota, Gold, USD/PKR, Lahore…
- `entity_links(entity_id, target_type, target_id, relation)`, polymorphic edges to article | tool | business | location | data_series | comparison.

## Data platform
- `data_series(slug, name, unit, frequency, source)` and `data_points(series_id, date, value)` unique per day.

## Audience
- `newsletter_subscribers`, `status` (pending | active | unsubscribed | bounced), `frequency`, `topics[]`, confirm/unsubscribe tokens, `source`.
- `newsletter_issues`, assembled issues (Phase 5).

## Search
- `search_documents`, one row per searchable thing: `entity_type`, `entity_id`, `url`, `title`, `summary`, `body`, `keywords`, `category`, `city`, `boost`, `popularity`, `published_at`, and two generated columns: `tsv` (weighted, English-stemmed, GIN) and `tsv_simple` (unstemmed, for prefix matching). Unique on `(entity_type, entity_id)`.
- `search_queries`, every search with `result_count` (zero-result queries = content backlog).
- `search_synonyms`, term → synonyms (Phase 5 query expansion).

## Platform
- `redirects`, old path → new path (URL changes must add a row).
- `media`, uploaded assets metadata.
- `analytics_events`, first-party events (`page_view`, `search`, `tool_run`, `business_click`, `business_lead`, `newsletter_subscribe`).
- `settings`, key/JSON site settings editable in admin.

## Conventions
- Never hand-edit files in `drizzle/`; generate them.
- Every mutation of a searchable entity calls the matching `index*()` in `src/lib/indexers.ts`.
- Local database: `.data/pglite` (gitignored). `npm run db:reset` wipes it.
