# Running Searchable on Cloudflare: allowances and the bill

Founder's rule (2026-09-15): the site must not run out of allowance on any service once it is live, and costs stay as close to zero as possible. Since ADR-44 (2026-09-19) everything runs on one Cloudflare account on the Workers Paid plan, USD 5 a month, shared by every site on the account; Resend stays for email. This document lists each allowance, what in the code keeps us under it, and what to watch. The old Vercel and Supabase notes are gone with the platforms (see git history before the `d1` branch, and `docs/INVENTORY.md` for what was measured on them).

## 1. The allowances (Workers Paid, as of September 2026)

| Service | Included in USD 5 a month | Beyond that | What would burn it |
| --- | --- | --- | --- |
| Workers requests | 10M a month | USD 0.30 per million | Bots hitting uncached pages; every static asset is free and unmetered |
| Workers CPU | 30M CPU ms a month, 30 s per request | USD 0.02 per million ms | Uncached renders at 100 to 280 ms each: 100k cache misses a day is 300M ms a month, so the page cache is what keeps this line near zero |
| D1 | 25B rows read, 50M rows written a month, 5 GB storage, 10 GB per database | USD 0.001 per million reads, USD 1 per million writes, USD 0.75 per GB | A query per page view (the Response Store prevents that), unbounded log tables (pruned) |
| R2 | 10 GB storage, 1M class A (writes), 10M class B (reads) a month, free egress | USD 0.015 per GB, USD 4.50 per million A, USD 0.36 per million B | Page-cache churn (every render writes one object), re-uploading photos |
| Durable Objects (page-cache index, SQLite) | 1M requests, 400k GB-s duration a month, 5 GB storage | USD 0.15 per million requests | A cache lookup per page render; misses cost two |
| Workflows | 10M steps a month | USD 0.30 per million | Nothing at our scale (two fuel runs a month) |
| Cron Triggers | Included | | Five triggers per account; four are used (ADR-46) |
| Workers Logs | 20M events a month, 7 days | USD 0.60 per million | `head_sampling_rate: 1`; lower it if events climb |
| Analytics Engine | 10M points written, 10k SQL reads a month | USD 0.25 per million points | `/admin/metrics` is cached ten minutes so reads stay in the hundreds |
| Turnstile | Free | | |
| Web Analytics, DNS, CDN, Redirect Rules | Free | | |
| Resend Free | 100 emails a day, 3,000 a month, one custom domain | USD 20 a month for 50k | A newsletter to 200 people, or a confirmation mail blocked because a newsletter used the day |
| Openverse | 200 requests a day anonymous, 10,000 with a client id | | Bulk photo seeding |

Expected bill at today's traffic (about 33k requests a day, 1M a month): USD 5 flat. The first line to move would be CPU if the cache hit rate fell; `/admin/system` shows the request and error counts, the Cloudflare dashboard shows CPU and D1 rows.

## 2. What the code does about it

### Requests and compute
- vinext's Response Store (ADR-44) keeps every rendered page in R2 (`searchable-page-cache`, APAC) with a SQLite Durable Object as the index: one render per revalidation window for the whole world, not one per data centre. Warm hits answer in 15 to 60 ms of wall time and about 5 ms of CPU; a miss renders at 100 to 280 ms of CPU. Publishing calls `revalidatePath` for the pages it touches, so ISR windows are the fallback, not the mechanism.
- Smart Placement runs the Worker near D1 (APAC), so a render is a few short round trips instead of many long ones.
- `HEAVY_COMPUTE=1` lets a request spend CPU on image resizing (photon, libwebp in WebAssembly, 200 to 500 ms) and the dynamic social card; the browser still prepares a master, 480 and 960 WebP before uploading (ADR-43), so the server usually only validates and stores.
- The header's mega menu is built once per 10 minutes (`unstable_cache`), not per request. `/api/feed` is cached for 5 minutes; the live panel polls every 5 minutes and stops when the tab is hidden. Search suggestions come from `/suggest-index.json`, matched in the browser. Social cards are cached immutable for a year per title.
- Anonymous visitors never call `/api/auth/get-session`: the header and review form check a readable `sp_auth` hint cookie first. Signed-in sessions are served from a signed cookie cache for 5 minutes (`cookieCache`).
- First-party beacons only record clicks that matter (business contact clicks, business page views, search result clicks, shares). Product events go to Analytics Engine (ADR-48); page views go to Cloudflare Web Analytics and Clarity.

### Crons
- The scheduler Worker (`workers/scheduler`, ADR-46) holds the four Cron Triggers: due jobs every five minutes, market ingest hourly, the full ingest daily at 02:30 UTC, the fuel-price Workflow on the 1st and 16th. It calls the site over a service binding with `CRON_SECRET`.
- `runDueJobs()` in `src/lib/jobs.ts` is still guarded to once per five minutes across instances by a `settings` row, and splits light work (publishing, sends, expiry) from heavy work every 30 minutes (photo backfill, mailbox mirroring, invites, digests).

### Images
- `STORAGE_PROVIDER=r2` writes through the `MEDIA` binding to `searchable-images`, served from `R2_PUBLIC_URL` (img.searchable.pk), which Cloudflare caches at the edge. Every object is written with `Cache-Control: public, max-age=31536000, immutable`. Egress is free.
- Pages use plain `<img srcset>` (`src/components/img.tsx`); no image optimiser is metered. If misses become a problem, switch on Smart Tiered Cache for the zone (free).

### Database
- D1 is SQLite next to the Worker; there is no connection pool to exhaust and no idle-pause. `getDb()` hands out one Drizzle client per isolate.
- `pruneOldRows()` (daily) deletes analytics events older than 90 days, error fingerprints unseen for 90 days, search logs older than 180 days and expired verification rows.
- Search documents store at most 20k characters of body per entry; FTS5 indexes them (docs/SEARCH.md). D1's 100 KB statement limit shaped the export (docs/schema-notes.md).

### Email
- `src/lib/email.ts` keeps a daily and monthly send counter in `settings` (`email:budget`). Defaults: 95 a day, 2,900 a month, with 15 a day held back for transactional mail. Bulk sends stop first. The provider is `@jet/email` over Resend's REST API (ADR-49).
- Newsletter issues are resumable: when the day's allowance runs out, progress is saved and the next run continues. Bounces and complaints close the subscription through the webhook.
- Practical ceiling on Resend Free: about 90 newsletter emails a day. Past that, Resend's paid tier or Cloudflare Email Service (one provider file) is the next step.

## 3. Operating checklist
1. Monthly: Cloudflare dashboard, Workers & Pages, Usage: requests, CPU time, D1 rows written, R2 class A operations. Any of them past half the included amount is a signal to look at the cache hit rate (`X-Nextjs-Cache` header, Workers Logs).
2. Weekly: `/admin/system` (errors, database size, email budget) and `/admin/metrics` (events, data freshness).
3. When a second site joins the account, it shares the same USD 5 and the same included amounts; there is no per-site charge.

## Image fallback
Images are served from the R2 custom domain. A tiny inline script in the root layout listens for image load errors from that host and retries the same file through `/media/…`, a rewrite that proxies the image CDN. It only fires when the CDN host is unreachable for that visitor, so origin transfer stays near zero. `/media/` is disallowed in robots.txt so the copies are never indexed.

## Error monitoring
No Sentry (ADR-48). `onRequestError` (`src/instrumentation.ts`) and `/api/client-errors` fingerprint every uncaught error into `error_fingerprints`; the first occurrence sends one email, repeats are counted. `/admin/system` shows the last week. Workers Logs keep the full stack for seven days.

## Daily pages
- Weather: MET Norway Locationforecast, no key, CC BY 4.0 with credit on the page. One fetch per city per 30 minutes through the data cache; the User-Agent names the site and a contact address as their terms require.
- Prayer times, sunrise, sunset and the Hijri date are computed (`src/lib/today`), no API at all.
- USGS earthquake feed: public domain, no key, one request per 10 minutes through the fetch cache.
- Microsoft Clarity loads after hydration on public pages only (not admin, account or dashboards).
- `src/proxy.ts` runs only on article, guide, tool and data paths (the matcher).
