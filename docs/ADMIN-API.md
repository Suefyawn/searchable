# Admin API

> **Contract frozen 2026-09-19** for the Cloudflare migration (docs/INVENTORY.md). Every route below keeps its path, method, auth, request fields and the response keys listed under "Response shapes" until the migration's contract suite (`tests/contract/admin-api.test.ts`) is green in production. Additions are allowed; changes and removals are not.

JSON API for automation: the scheduled content task, scripts, anything that should do what an editor does without a browser. Every route runs as the first admin account and calls the same server actions as the dashboard, so validation, search indexing, cache revalidation, IndexNow pings and email budgets all apply. Write calls are logged as `admin_api` analytics events.

## Auth
```
Authorization: Bearer <key>
Content-Type: application/json
```
Keys are made at `/admin/api-keys` (admin only): one per tool, named, `spk_` plus 64 hex characters, shown once, revocable one by one. A key acts as the admin who made it, with the role chosen for the key (`admin`: everything the API exposes; `editor`: the desk, no accounts or settings). The `ADMIN_API_KEY` environment variable still works as a bootstrap key and acts as the first admin. A key only works on this header; it never creates a browser session. Wrong, missing or revoked key: `401 {"error": "..."}`. No key configured anywhere: `503`. Validation problems: `400` with `issues[]`. Unknown ids: `404`.

Base URL: `https://searchable.pk/api/admin`. All slugs (categories, cities, series, entities) come from `GET /reference`.

## Read first
| Route | Returns |
|---|---|
| `GET /context` | Karachi time, last 40 published articles (do not repeat them), drafts, scheduled, queue counts, every data series with latest and previous reading, top searches, searches that found nothing, email budget left, last job and ingestion run, `directory` counts by city and category, `newsDesks` (every news category with its story count and hours since its newest story, stalest first) |
| `GET /reference` | news and guide categories, business categories, cities and areas, entities, data series, professions, calculators with URLs, authors |
| `GET /ideas?topic=&region=&limit=` | headlines from the press feeds: title, source, URL, time. Topics: general, business, tech, world, cricket, entertainment, markets, crypto, us, mma, snooker. Region pk or world |
| `GET /backlog?status=` | search-demand backlog (Semrush, Pakistan): keyword, volume, KD, score, type, target, brief, status; `POST /backlog` sets status or upserts items |
| `GET /queue` | everything waiting: pending businesses, claims, professionals, posts, comments, reviews, open reports, new contact messages, pitches (with text) |
| `GET /inbox?status=new&mailbox=&q=&limit=` | received mail; `GET /inbox?id=<id>&html=1` for one message with body |
| `GET /articles?status=&kind=&q=&limit=` | article list; `GET /articles/{id}` full article with markdown, sources, faqs, entities, tags |
| `GET /businesses?status=&q=&limit=` | business list |
| `GET /data` | every series with latest and previous reading |
| `GET /ingest/status` | freshness of every automatically ingested series: last run, last success, last value, last error and hours since the last success (sources that failed appear by name, SBP or PSO). Check it before writing about a number; mention anything stale in the report |
| `GET /newsletter` | recent issues and a suggested draft assembled from this week's content |

## Write
### Articles
`POST /articles`
```json
{
  "kind": "news",                       // or "guide"
  "title": "Petrol goes up Rs 2.61 from tonight: what a full tank costs now",
  "dek": "One or two sentences that make the reader want the story.",
  "body": "## Markdown body ...",       // headings, lists, tables, links to /tools and /guides
  "category": "economy",                // slug from /reference (news or guide categories by kind)
  "city": "lahore",                     // optional location slug
  "entities": ["ogra", "fbr"],          // optional entity slugs
  "tags": ["petrol", "OGRA"],
  "sources": [{ "title": "OGRA notification 15 Sept", "url": "https://...", "publisher": "OGRA" }],
  "faqs": [{ "question": "...", "answer": "..." }],
  "seoTitle": "optional, 60 chars", "seoDescription": "optional, 155 chars",
  "featured": false,
  "image": { "query": "petrol pump Lahore", "alt": "A PSO pump in Lahore" },
  "intent": "publish"                   // "publish" (default) | "schedule" (+ "scheduledFor": ISO) | "draft"
}
```
Image options: `{ "query": "...", "entities": ["Babar Azam"] }` tries the Wikipedia lead photo of each named entity (defaults to the capitalised names in the title), then ranks openly licensed photos from Openverse and Wikimedia Commons by how well their own description matches the entities, the query and the headline (ADR-51); for `kind: "news"` a candidate under the bar is refused and the story publishes without a photo (`note` says so), while guides may fall back to a scene for the topic; `{ "url": "https://...", "credit": "...", "sourceUrl": "...", "license": "by-sa" }` imports a photo you already know is openly licensed; an existing `https://img.searchable.pk/...` URL is reused as is. Omit `image` to keep the current one on an update; `PATCH /articles/{id} {"image": null}` removes it. Pass `id` (or the same `slug` and `kind`) to update. Response: `{ id, status, url, image, note? }`.

`PATCH /articles/{id}` `{ "intent": "publish" | "unpublish" | "schedule", "scheduledFor"? }` changes status; `{ "image": ... }` (same shapes as POST) swaps only the photo and keeps the status; `{ "slug": "new-address" }` moves the story and leaves a permanent redirect from the old address (so does changing the slug or category on POST). `DELETE /articles/{id}`.

### Data
`POST /data`
- `{ "readings": [{ "series": "petrol-price", "value": 272.61, "date": "2026-09-16", "note": "OGRA notification", "sourceUrl": "https://..." }] }`: record readings by hand. Date defaults to today (Pakistan time). Series slugs from `/reference`.
- `{ "ingest": true, "force": false }`: run the automatic sources (SBP, PSO, gold, PSX, CoinGecko, cross rates). Readings that jump more than 30% are held unless `force` is true.

### Businesses
`POST /businesses` `{ "businesses": [ { "name", "category", "city", "area"?, "address"?, "phone"?, "whatsapp"?, "website"?, "email"?, "description"?, "tagline"?, "lat"?, "lng"?, "opens"?, "closes"?, "closedDays"?, "services"?: [], "priceRange"?: 1-4 } ], "publish": true, "includeDuplicates": false }`
Same pipeline as the CSV importer: category by slug or alias (restaurant, dentist, solar...), city by slug, phones normalised, duplicates (same name in the city, or same phone) reported in `skipped` and not created unless `includeDuplicates`. Up to 200 per call.

### Queue (moderation)
`POST /queue` `{ "type", "id", "action", "note"? }` or `{ "actions": [ ... ] }` (up to 100).

| type | actions |
|---|---|
| business | approve, reject, close, verify, unverify |
| claim | approve, reject |
| professional | approve, reject, hide, verify, unverify |
| post | approve, reject, hide, verify, pin |
| comment | approve, hide, delete |
| member | ban, unban, verify, unverify (id is the user id) |
| business_review, professional_review | approve, hide |
| report | resolve, dismiss |
| message | replied, archive |
| submission | reviewing, accepted, rejected |

### Inbox
`POST /inbox`: `{ "id", "reply": "text" }` sends a reply from the mailbox the mail arrived at (threaded, original quoted, counts against the email budget); `{ "id", "status": "archived" }`; `{ "id", "read": true }`; `{ "sync": true }`.

### Newsletter
`POST /newsletter`: `{ "create": true, "frequency": "daily", "subject"?, "preheader"?, "body"?, "scheduledFor"? }` (omit subject and body to use the automatic assembly of this week's stories); `{ "id", "scheduledFor" }`; `{ "id", "sendNow": true }`; `{ "id", "sendTestTo": "you@..." }`.

### Data corrections
`DELETE /data` `{ series, dates[] }` removes readings that were verified wrong (seed placeholders, parser slips); the series is re-indexed and re-rendered.

### Front page
`GET /front` and `POST /front` `{ leadId?, leadHours?, pins?, breaking?, featured? }`: the homepage hero and news-front controls, the same as `/admin/front-page`. `leadId` pins a story as lead for `leadHours` (null hands back to automatic), `pins` is the ordered list of stories after the lead (max 6), `breaking` `{ text, href?, hours? }` puts a black bar across every page until it expires (null clears), `featured` `{ id, on }` sets the featured flag on one story (the newest featured story leads automatically for 48 hours; only one carries the flag).

### Prices
`GET /prices?category=mobiles|bikes|cars[&brand=vivo]` returns the living price list for that category (item shape in `src/lib/prices-shared.ts`); `POST /prices` `{ category, items, mode?: "upsert" | "replace", remove?: [slugs], reviewedAt? }` adds or updates models (a changed price is appended to that model's history), drops discontinued ones, and revalidates `/prices/*`. Mobiles need `specs.ram`, `specs.storage` and `specs.battery`; bikes and cars need `specs.engine`; every item needs a `source` URL.

### Posts
`GET /posts?kind=job` lists published posts of a kind (so a vacancy is never posted twice); `POST /posts` with `kind: "job"` publishes a vacancy as the desk (title, body markdown, company, city slug, topic, employmentType, salary range, applyUrl (required, the official notice), deadline) and `{ id, intent: "close" }` closes one. Job posts expire 45 days after publishing and are pruned by the daily job.

### Match
`GET /match` returns the fixtures on file grouped into today, live, upcoming and recent; `POST /match` `{ matches: [...] }` replaces the list (shape in `src/lib/match-today.ts`) and revalidates `/cricket-today`, `/today` and the home ticker, which shows the live score or today's first fixture as its first cell.

### Today
`GET /today` returns the Islamic date the site shows for Pakistan, the Umm al-Qura table date and the sighting offset in force; `POST /today` `{ "days": -1|0|1, "note"?, "sourceUrl"? }` sets the offset after a Ruet-e-Hilal Committee announcement (1 when Pakistan began the month a day before the table, -1 a day after, 0 when they agree) and revalidates /islamic-date, /today and the prayer pages.

### Compare
`GET /compare?slug=air-conditioners|credit-cards|mobile-packages|national-savings` and `POST /compare` `{ slug, items: [{ id, brand, model, price, priceNote?, url?, specs: {...}, note? }], reviewedAt: "YYYY-MM-DD", source: { title, url?, publisher? } }`: the living comparisons (`/compare/air-conditioners`, `/compare/credit-cards`). POST replaces the whole set, so send every item each time. Air conditioners need `specs.tonnage` (1, 1.5, 2) and `specs.inverter` (true/false); useful extras: `heatCool`, `t3`, `eer`, `wifi`, `warranty` (years). Credit cards: `price` is the annual fee, `specs.bank`, `specs.network` (Visa, Mastercard, UnionPay), `apr` (percent a year), `minIncome` (rupees a month), `cashback`, `lounge`, `fuel`, `freeFirstYear`, `islamic`. Mobile packages: `price` is the package price, `specs.network` (Jazz, Zong, Telenor, Ufone), `validity` ("Monthly", "Weekly", "Daily"), `data` (GB as a number), `onnetMinutes`, `offnetMinutes`, `sms`, `code` (the subscription code as printed). National Savings: `price` is the profit rate in percent a year, `model` the scheme name, `specs.payout` (Monthly, Half-yearly, At maturity), `term`, `min`, `max`, `who`, `withholding`, `islamic`; source is the CDNS profit-rate sheet. Every price and rate must come from the brand's own price list or the bank's schedule of charges, with that page as `url`.

### Media
`POST /fetch`: `{ "url", "format"?: "markdown" | "html" | "text", "waitFor"?, "selector"?, "timeoutMs"? }` renders the page in a Cloudflare browser (Browser Run, ADR-55) and returns `{ url, format, content, length, browserMs }`. For pages that render their content client-side or refuse plain fetchers; browser time is metered (10 hours a month included), so it is the fallback after a plain fetch, not the default.

`POST /media`: `{ "search": "Karachi skyline", "entities"? }` lists candidates (Wikipedia photo of each entity, then Openverse, then Commons), each with `alreadyUsed: true` when that source photo is already on the site (automatic imports skip those on their own); `{ "query": "...", "alt"? }` imports the first usable one; `{ "url", "alt"?, "credit"?, "sourceUrl"?, "license"? }` imports a known openly licensed image. Returns the stored URL and credit.

**Prepared upload (works on every server, required where the server cannot resize).** `POST /media` as `multipart/form-data` with three WebP files, `master` (longest side at most 1800 px for `article`, 2000 for `cover`, 1600 for `photo`, 512 for `logo`), `r960` and `r480` (exactly 960 and 480 px wide, or the master's width when it is narrower), plus text fields `alt`, `credit`, `sourceUrl`, `license`, `variant`. The server reads the WebP headers, checks the sizes, stores the three files and answers `{ ok, image: { url, width, height, ... } }`. Pass that `url` as `image.url` to `POST /articles` or `PATCH /articles/{id}`; a URL on our own image host is linked, never re-imported. When a server answers `400` with "This server does not resize images", the `{ query }` and `{ url }` forms are unavailable there and this is the way (ADR-43).

### Reports
`POST /report` `{ "slot", "report" (markdown), "published"?, "updated"?, "errors"? }` files a run report; it shows on `/admin/automation`. `GET /report` lists the last twenty.

### Jobs
`POST /jobs` `{ "job": "due" | "reindex" | "prune" | "revalidate" | "remove-sample" | "renditions", "paths"? }`. `due` runs the five-minute scheduler now, `reindex` rebuilds the search index, `prune` deletes aged analytics and search logs, `revalidate` purges the given paths (default: the hubs), `remove-sample` deletes the seeded sample content, `renditions` writes any missing 480 and 960 px image files.

## Response shapes

Top-level keys the contract suite asserts. Errors are always `{ "error": string, "issues"?: [] }` with 400 (validation), 401 (key missing or wrong), 403 (account not allowed), 404 (unknown id), 503 (`ADMIN_API_KEY` not configured).

| Route | Success keys |
|---|---|
| `GET /context` | `site, now, nowKarachi, recentArticles, drafts, scheduled, queues, directory, newsDesks, data, topSearches, searchesWithNoResults, email, lastJobsRun, lastIngestion, weekSince` |
| `GET /reference` | `articleKinds, newsCategories, guideCategories, businessCategories, cities, areas, entities, dataSeries, professions, tools, authors, articleStatuses` |
| `GET /ideas` | `headlines` |
| `GET /ingest/status` | `at, sources` (each: `source, lastRunAt, lastSuccessAt, lastValue, lastStatus, lastError, staleHours`) |
| `GET /backlog` / `POST /backlog` | `items` / `ok` |
| `GET /queue` / `POST /queue` | `businesses, claims, professionals, posts, comments, businessReviews, professionalReviews, reports, messages, submissions` / `ok, results` |
| `GET /articles` / `POST /articles` | `articles` / `ok, id, status, url, image` |
| `GET /articles/{id}` / `PATCH` / `DELETE` | `article` / `ok, id, status, url, image` / `ok, deleted` |
| `GET /businesses` / `POST /businesses` | `businesses` / `ok, created, skipped` |
| `GET /data` / `POST /data` / `DELETE /data` | `series` / `ok, recorded` or `ok, results` (ingest) / `ok, series, removed, missing` |
| `GET /front` / `POST /front` | `front` / `ok, front` |
| `GET /prices` / `POST /prices` | `category, reviewedAt, count, items` / `ok, category, live, added, updated, removed` |
| `GET /compare` / `POST /compare` | `slug, items, reviewedAt, source` / `ok, slug, items, reviewedAt` |
| `GET /match` / `POST /match` | `updatedAt, matches` / `ok, matches` |
| `GET /today` / `POST /today` | `date, pakistan, umalqura, offset` / `ok, offset, pakistan` |
| `GET /posts` / `POST /posts` | `kind, posts` / `ok, id, status, url` |
| `POST /media` | `candidates` (search) or `ok, image` (import) |
| `GET /inbox` / `POST /inbox` | `messages` or `message` / `ok` |
| `GET /newsletter` / `POST /newsletter` | `issues, suggestedDraft` / `ok` plus `issue`, `sent, remaining`, `sentTestTo` or `id, scheduledFor` by action |
| `GET /report` / `POST /report` | `reports` / `ok, id, at` |
| `POST /jobs` | `ok` plus the job's own counters |

Every non-GET call is logged as an `admin_api` analytics event with method, status and duration; `/admin/automation` and `/admin/system` read those rows.

## Rules the automation must follow
1. Read `/context` first. Never publish a story whose subject is already in `recentArticles`; update that article instead (`PATCH` or `POST` with its `id`).
2. No em dashes anywhere. Pakistan-first framing: rupees, local examples, what it means for the reader, and a link to a calculator, guide or data page in every story.
3. Sources: every news story carries at least one source with a URL. Never reproduce press text; write the Searchable version.
4. Images only from `{ "query" }` (Openverse, credit handled) or a URL you know is openly licensed. No scraped press photos.
5. Data readings need a `sourceUrl`; the automatic ingest handles daily market numbers, hand entry is for notifications (OGRA, SBP policy rate, NEPRA tariffs).
6. Stay inside the email budget shown in `/context` (`email.leftToday`) when replying or sending newsletters.
7. Moderate conservatively: approve what is clearly fine, reject spam and scams with a one-line note, leave anything doubtful for a human.
