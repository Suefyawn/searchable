# Running Searchable on free plans

Founder's rule (2026-09-15): the site must not run out of free usage on Supabase, Vercel, Resend or anything else once it goes live. Images go to Cloudflare. This document lists each allowance, what in the code keeps us under it, and what to switch on at go-live. Nothing here is live yet; everything is wired and dormant behind environment variables.

## 1. The allowances (as of September 2026, check before go-live)

| Service | Free allowance | What would burn it |
| --- | --- | --- |
| Vercel Hobby | 100 GB data transfer, 1M function invocations and 4 CPU-hours per month, 1M edge requests, 5,000 image optimisations, 2 cron jobs that run at most once a day, non-commercial use only | Every request that misses the CDN, every `next/image`, every API beacon, a 5-minute cron |
| Supabase Free | 500 MB database, 5 GB egress, 1 GB storage, 50k monthly active users, project pauses after 7 days without activity | Serving images from Supabase Storage, unbounded log tables, a query per page view |
| Resend Free | 100 emails a day, 3,000 a month, one custom domain | A newsletter to 200 people, or a confirmation mail blocked because a newsletter used the day |
| Cloudflare R2 | 10 GB storage, 10M reads and 1M writes a month, no egress charge | Nothing at our scale; images belong here |
| Cloudflare (DNS, CDN, Web Analytics, Turnstile) | Unlimited | |
| Openverse | 200 requests a day anonymous, 10,000 with a client id | Bulk photo seeding |
| cron-job.org | Free, 1-minute granularity | Replaces the 5-minute Vercel cron we cannot have |

**Commercial use.** Vercel's Hobby plan is for personal, non-commercial projects; a site running AdSense and selling listings is commercial. Two honest options: pay for Vercel Pro (USD 20 a month) once ad revenue covers it, or host on Cloudflare Workers, whose free plan allows commercial use (100k requests a day, static assets unlimited) and runs Next.js through `@opennextjs/cloudflare`. The code is written to be host-agnostic (no Vercel-only APIs beyond `vercel.json` crons). Decide at go-live; ADR-24.

## 2. What the code does about it

### Requests and compute
- Every public page is static or ISR (`revalidate` 300 to 86,400 s). A request costs a CDN hit, not a function call. Publishing an article calls `revalidatePath` for the pages it touches, so ISR windows are the fallback, not the mechanism.
- The header's mega menu is built once per 10 minutes (`unstable_cache`), not per request.
- `/api/feed` is CDN-cached for 5 minutes; the live panel polls every 5 minutes and stops when the tab is hidden.
- Search suggestions come from `/suggest-index.json` (one small file, CDN-cached an hour, matched in the browser). `/api/suggest` only fires for businesses and news when the local index is thin, and its responses are CDN-cached per query. Typing costs nothing.
- Social cards (`/og`) are cached immutable for a year per title.
- Anonymous visitors never call `/api/auth/get-session`: the header and review form check a readable `sp_auth` hint cookie first. Signed-in sessions are served from a signed cookie cache for 5 minutes (`cookieCache`), so browsing admin does not hit the database on every request.
- First-party analytics only records clicks that matter (business contact clicks, search result clicks, shares). Page views are not beaconed; use Cloudflare Web Analytics (free, no quota) for traffic.
- The search page caches its side rails (trending, popular, cities) for 10 minutes; a search is one query plus one facet count.

### Crons
- Free plans allow only daily crons, so `vercel.json` has two daily jobs: `ingest` (02:30 UTC: data hub, pruning, due jobs) and `publish` (03:00 UTC).
- Anything that needs to happen "within a few minutes" (scheduled articles, newsletter sends, plan expiry) runs through `runDueJobs()` in `src/lib/jobs.ts`. It is called by the live feed regeneration, by admin page loads and by the crons, guarded to once per 5 minutes across all instances by a `settings` row. Point cron-job.org at `/api/cron/publish` every 5 minutes with `authorization: Bearer $CRON_SECRET` to make it exact.
- The daily cron keeps the Supabase project active, so it never pauses.

### Images
- `STORAGE_PROVIDER=r2` writes originals plus 480 px and 960 px renditions to Cloudflare R2 through the S3 API (SigV4 signed in `src/lib/storage.ts`, no SDK). They are served from `R2_PUBLIC_URL`, a custom domain on the bucket that Cloudflare caches at the edge. Egress is free.
- Pages use plain `<img srcset>` (`src/components/img.tsx`, `srcSetFor()`), so Vercel's metered optimiser is never used (`images.unoptimized`).
- `scripts/image-renditions.ts` backfills renditions for images uploaded before this change.
- Supabase Storage stays supported but is not recommended: its 5 GB egress would be the first thing to go.

### Database
- Serverless functions open at most one Postgres connection each, through the Supabase transaction pooler (port 6543), with short idle timeouts.
- `pruneOldRows()` (daily) deletes analytics events older than 90 days, search logs older than 180 days and expired verification rows. Admin reports aggregate what remains.
- Search documents store at most 20k characters of body per entry.
- Press headlines are cached in memory for 15 minutes and never stored.

### Email
- `src/lib/email.ts` keeps a daily and monthly send counter in `settings` (`email:budget`). Defaults: 95 a day, 2,900 a month, with 15 a day held back for transactional mail (confirmations, invoices). Bulk sends stop first.
- Newsletter issues are resumable: when the day's allowance runs out, progress is saved (`newsletter:progress:<id>`) and the next run continues. An issue is marked sent only when every subscriber has it.
- Practical ceiling on Resend Free: about 90 newsletter emails a day, so roughly 600 weekly subscribers or 90 daily ones. Past that, Resend's paid tier (USD 20 for 50k) or moving the newsletter to a free-tier list provider is the next step; the adapter is one function.

## 3. At go-live (in this order)
1. Cloudflare: move DNS, enable proxying and Web Analytics, create the R2 bucket with a custom domain, create an API token with object write. Set `STORAGE_PROVIDER=r2` and the five `R2_*` variables. Run the media re-upload from admin for existing photos (or `scripts/seed-images.ts` again).
2. Supabase: create the project, set `DATABASE_URL` to the pooler URL, run `npm run db:migrate`, then `npm run db:seed` and `npm run search:reindex`. Enable `pg_trgm` (it is preinstalled).
3. Resend: verify the domain, set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and keep the default caps. Keep the newsletter weekly by default.
4. Host: Vercel with two daily crons and `CRON_SECRET`, or Cloudflare Workers via OpenNext (ADR-24 decides). Either way add the cron-job.org pinger for `/api/cron/publish` every 5 minutes.
5. Watch the dashboards for the first month: Vercel usage, Supabase database size and egress, Resend sends. The admin dashboard shows the email budget and last job runs.

## Database driver note
postgres-js talks to Supabase's transaction pooler (port 6543) with `prepare: false` and `max_pipeline: 0` (pipelining off only on 6543; it also disables postgres-js transactions, which the app never uses but the migrator does, so scripts must use the session pooler on 5432). Supavisor in transaction mode stalls when more than a few queries are pipelined on one connection, which showed up as 60-second prerender timeouts on the first Vercel build. With pipelining off, queued queries run one after another on the single serverless connection; a cold page render pays a few hundred milliseconds, ISR hits pay nothing. Scripts (migrations, seeds) use the session pooler on 5432, which does not have the problem.

## Image fallback
Images are served from the R2 custom domain. A tiny inline script in the root layout listens for image load errors from that host and retries the same file through `/media/…`, a Next rewrite that proxies the CDN. It only fires when the CDN host is unreachable for that visitor (an extension, a per-site image setting, an ISP), so the metered origin transfer stays near zero in normal use. `/media/` is disallowed in robots.txt so the copies are never indexed.
