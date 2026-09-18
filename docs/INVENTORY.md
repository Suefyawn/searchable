# Inventory before the Cloudflare migration

Captured 2026-09-19 (Phase 0 of the migration plan). Read-only: nothing in production changed. Sources: the repository at commit f26a3c8, the Supabase, Vercel, Cloudflare and Resend accounts through their connectors, and `curl` against the live host. Secrets are named, never written.

## 1. Hosting today

| Concern | Today |
|---|---|
| Runtime | Next.js 16.3.5, App Router, Node 22, deployed on Vercel Hobby, functions in Tokyo (`hnd1`, `vercel.json`) |
| Database | Supabase Postgres, project `searchablepk` (ap-northeast-1). App on the transaction pooler 6543 with `max_pipeline: 0`; scripts on the session pooler 5432 |
| Images | Cloudflare R2 bucket `searchable-images`, public at `img.searchable.pk` (proxied, Smart Tiered Cache on). Uploads are hand-signed S3 PUTs from `src/lib/storage.ts` |
| Email | Resend, domain `searchable.pk` verified, sending and receiving, region ap-northeast-1. Webhook for `email.received` at `/api/webhooks/resend` |
| DNS | Nameservers at Cloudflare. Apex `A` records point at Vercel (216.198.79.65, 64.29.17.65) **DNS-only**; `www` is a CNAME to Vercel DNS, also DNS-only. Only `img.searchable.pk` is proxied |
| Crons | `vercel.json`: `/api/cron/ingest` 02:30 UTC, `/api/cron/publish` 03:00 UTC. cron-job.org job 8459170 pings `/api/cron/publish` every 5 minutes with `Authorization: Bearer $CRON_SECRET` |
| Automation | Two Cowork scheduled tasks (day: 06:30, 09:30, 12:30, 15:30, 18:30 PKT; night: 22:00 PKT) writing through `/api/admin/*` per `docs/ADMIN-API.md` |
| Analytics | Microsoft Clarity on public pages. First-party events in `analytics_events`. No Cloudflare Web Analytics beacon yet |
| Errors | `src/instrumentation.ts` `onRequestError` writes `error` rows into `analytics_events`; `/admin/system` groups the last day. No Sentry |
| CI | GitHub Actions `ci.yml`: typecheck, lint, migrate + seed against PGlite, build. `npm test` is not run in CI |

## 2. Canonicalization captures

```
curl -sI http://searchable.pk/
HTTP/1.0 308 Permanent Redirect
Location: https://searchable.pk/
server: Vercel

curl -sI https://www.searchable.pk/
HTTP/1.1 308 Permanent Redirect
Location: https://searchable.pk/
Strict-Transport-Security: max-age=63072000

curl -sI https://www.searchable.pk/api/admin/context -H "Authorization: Bearer x"
HTTP/1.1 308 Permanent Redirect
Location: https://searchable.pk/api/admin/context

curl -s -o /dev/null -w "%{http_code}" https://searchable.pk/api/admin/context -H "Authorization: Bearer x"
401

curl -sI https://searchable.pk/
HTTP/1.1 200 OK
Cache-Control: public, max-age=0, must-revalidate
X-Vercel-Cache: HIT
Strict-Transport-Security: max-age=63072000
```

What this means for the migration:

- `www` and `http` redirect with **308** from Vercel's domain configuration. There is no redirect code in the repo (`src/proxy.ts` only negotiates markdown). The Worker deployment reproduces this as a Cloudflare Redirect Rule (301) plus Always Use HTTPS, and the automation keeps hitting the apex directly so no redirect ever sees its `Authorization` header.
- HSTS (`max-age=63072000`) is added by Vercel. The Cloudflare zone must set HSTS itself at cutover, same max-age, no preload until stable.
- Because the apex is DNS-only today, pages are served by Vercel's edge (Mumbai for Pakistan) and not by Cloudflare. Cutover is therefore a DNS change (the Worker custom domain replaces the two `A` records), not a route flip. Lower the record TTL to 300 the day before so rollback is quick.

## 3. Database

Production: **25 MB**, 13 Drizzle migrations applied (`0000` to `0012`), `pg_trgm` enabled. Row counts:

| Table | Rows | | Table | Rows |
|---|---|---|---|---|
| analytics_events | 773 (all `admin_api`) | | data_points | 88 |
| article_tags | 688 | | locations | 62 |
| search_documents | 646 | | tools | 40 |
| business_services | 602 | | categories | 33 |
| tags | 542 | | redirects | 30 |
| business_category_links | 331 | | entities | 27 |
| businesses | 331 | | business_categories | 25 |
| article_revisions | 310 | | search_queries | 19 |
| media | 282 | | posts | 19 |
| entity_links | 268 | | data_series | 18 |
| business_hours | 175 | | settings | 16 |
| articles | 135 | | tool_runs | 15 |
| search_synonyms 9, sessions 5, inbox_messages 4, users 3, accounts 3, member_profiles 3, newsletter_subscribers 3 (1 active), newsletter_issues 3, authors 1, submissions 1 | | | 16 tables empty | |

About 6,000 rows in total. Postgres features in use that D1 (SQLite) does not have: 13 enums, 28 `jsonb` columns, `timestamptz`, `double precision`, two generated `tsvector` columns with GIN indexes, `pg_trgm` trigram indexes, and 115 raw `sql` template sites across 37 files (casts, `interval`, `->>`, `filter (where)`, window functions, `ts_rank_cd`, `ts_headline`, `similarity`). Zero transactions. Translation rules live in `docs/schema-notes.md` (Phase 2).

Sizing against D1 Free: 25 MB against a 500 MB ceiling; 6,000 rows against 100,000 writes a day, so the import is one `wrangler d1 execute --file` run.

## 4. Routes

| Kind | Count |
|---|---|
| `page.tsx` | 129 (88 public, 36 admin, 5 account) |
| Route handlers | 58 (37 under `/api`, 21 special: robots, sitemaps, feeds, og, llms, openapi, well-known, mcp, a2a) |
| Admin API routes (`/api/admin/*`) | 20 files, Bearer `ADMIN_API_KEY`, contract frozen in `docs/ADMIN-API.md` |
| Files with `revalidate` | 92; `generateStaticParams` 36 (all return `[]` to force ISR); `revalidatePath` calls 147 in 37 files; `revalidateTag` 0 |
| `"use server"` files | 30, exporting 83 actions |
| `maxDuration = 60` | 10 files (cron, upload, heavy admin routes) |

Auth mechanisms: Bearer `ADMIN_API_KEY` (constant-time compare in `src/lib/auth.ts`), Bearer `CRON_SECRET` (`src/lib/jobs.ts`), better-auth session cookies, Svix-style HMAC on the Resend webhook, none plus rate limits on public forms.

## 5. Node-only code on the request path

| File | Dependency | Replacement in Phase 1 |
|---|---|---|
| `src/lib/storage.ts` | `sharp` (native), `node:crypto`, `node:fs`, `process.cwd()`, hand-signed SigV4 | WASM resizer, R2 binding, Web Crypto |
| `src/app/og/route.tsx` | `node:fs/promises` font reads, `runtime = "nodejs"`, `outputFileTracingIncludes` | fonts as assets |
| `src/db/index.ts` | `dotenv/config`, `node:fs`, `node:path`, PGlite, postgres-js | Hyperdrive (Phase 1), D1 (Phase 2) |
| `src/lib/email.ts` | `node:fs` `.eml` outbox | console provider |
| `src/lib/auth.ts`, `jobs.ts`, `claims.ts`, `commerce.ts`, `inbox.ts`, `a2a.ts`, `admin/users/actions.ts`, `.well-known/agent-skills/index.json/route.ts` | `node:crypto` (`timingSafeEqual`, `createHmac`, `createHash`, `randomInt`, `randomUUID`) | one Web Crypto helper |
| `src/lib/rate-limit.ts` | in-memory `Map` per instance | Rate Limiting binding |
| `src/lib/open-images.ts`, `src/lib/jobs.ts` | module-global caches (`cachedToken`, `openverseDownUntil`, `lastLocalRun`) | `settings` rows; the `jobs:last` row already guards across instances |
| `src/instrumentation.ts` | returns early unless `NEXT_RUNTIME === "nodejs"` | remove the guard |

`Buffer` is used in ten files and is available under `nodejs_compat`.

## 6. Scheduled and opportunistic work

| Job | Trigger today | Frequency | Idempotency |
|---|---|---|---|
| `runIngestion` (er-api, PSO, gold-api, PSX, CoinGecko; SBP returns 403 from cloud IPs) | `GET /api/cron/ingest` | daily | upsert on `(series, date)`, 30 percent jump guard, draft slug `slug-date` |
| `indexTools`, `pruneOldRows` | same cron | daily | upsert by slug; date-window deletes |
| `publishDueArticles`, `sendDueIssues`, `expireLapsedPlans` | `runDueJobs()` from cron-job.org, `/api/feed`, every admin page load | every 5 min | `settings` row `jobs:last` claimed with `updated_at < now() - 4m30s` |
| `sendClaimInvites`, `sendActivityDigests`, `syncInbox`, `backfillArticlePhotos` | `runDueJobs()` heavy branch | every 30 min | `heavyAt` in the same row; email budget; `digest:last` high-water mark |
| `backfillRenditions`, `reindexAll`, `removeSampleContent` | `POST /api/admin/jobs` | manual | HEAD before write; full truncate then rebuild |

External hosts fetched: open.er-api.com, psopk.com, api.gold-api.com, dps.psx.com.pk, api.coingecko.com, sbp.org.pk (403), api.resend.com, api.indexnow.org, api.openverse.org, commons.wikimedia.org, en.wikipedia.org, api.met.no, earthquake.usgs.gov, 28 RSS hosts in `src/lib/press.ts`.

## 7. Environment keys

Set in Vercel (production and preview), names only: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`, `CRON_SECRET`, `ADMIN_API_KEY`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `EMAIL_DAILY_CAP`, `EMAIL_MONTHLY_CAP`, `EMAIL_BULK_RESERVE`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `STORAGE_PROVIDER`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `BILLING_EMAIL`, `EDITORIAL_EMAIL`, `CLAIM_WHATSAPP_NUMBER`, `INDEXNOW_KEY`, `GOOGLE_SITE_VERIFICATION`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

On Workers the five `R2_*` keys become a bucket binding and `DATABASE_URL` becomes a Hyperdrive binding (Phase 1) and then a D1 binding (Phase 2). New keys: `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` (Phase 5), `CF_ANALYTICS_TOKEN`, `NEXT_PUBLIC_CF_BEACON` (Phase 7).

## 8. Cloudflare account state

Zero Workers, zero D1 databases, zero KV namespaces, zero Hyperdrive configurations. R2 buckets: `searchable-images`, `yellowpink-images` (another business; not touched). Zone `searchable.pk` on Cloudflare nameservers with proxying only on `img`.

## 9. Traffic profile

Vercel's usage API is not available on Hobby. Peak hours in PKT come from Clarity when the founder reads them; the cutover window 22:00 to 06:30 PKT sits between the Night and Dawn slots regardless.
