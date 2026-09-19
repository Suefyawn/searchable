# Cutover runbook: searchable.pk from Vercel + Supabase to Cloudflare Workers + D1

Phase 9 of the migration plan (ADR-41 to ADR-49). Everything below the line "Founder steps" needs either a value only the founder holds or a change to the live domain, which is why it is written as commands rather than done. Window: 22:00 to 06:30 PKT, a quiet night. Nothing here is destructive to the old system; Vercel and Supabase keep serving until the DNS records change, and rollback is putting those records back.

## State on 2026-09-19 (prepared by the migration session)

| Piece | State |
| --- | --- |
| Code | branch `d1`, CI green (typecheck, lint, tests, authz guard, local D1 migrations, build). `main` is still the Vercel line. |
| Staging | Worker `searchable` at https://searchable.sooviaan.workers.dev on D1 `searchable-staging` with production data from 2026-09-19 02:00 UTC, contract suite and scripted slot green, Turnstile live, scheduler `searchable-scheduler` running. |
| Production Worker | `searchable-production`, deployed dark at https://searchable-production.sooviaan.workers.dev. Fenced by `EMAIL_PROVIDER=none`, `JOBS_DISABLED=1`, `workers_dev: true` in `wrangler.jsonc` `env.production`. No route on searchable.pk yet. |
| Production D1 | `searchable` (id `1a91bc6d-7826-499d-b677-e5ad6bd1e18b`), all four migrations applied, full import plus a delta up to 08:00 UTC 2026-09-19 done, search index rebuilt (678 documents). Contract suite 13/13 and the scripted slot green against the dark Worker at 08:30 UTC. |
| Production secrets set | `ADMIN_API_KEY` (the same key the editorial tasks use today, so their prompts need no change), `BETTER_AUTH_SECRET` (new: every member signs in again once), `CRON_SECRET` (new, shared with the scheduler at deploy), `INDEXNOW_KEY` (new), `TURNSTILE_SECRET`, `RESEND_WEBHOOK_SECRET` (same as production today), `GOOGLE_SITE_VERIFICATION` (same). The new values are in the migration machine's `%TEMP%\sec-*-production.txt` files, nowhere else. |
| Production secrets missing | `RESEND_API_KEY` (create one in Resend for the Worker, or reuse Vercel's), `BILLING_EMAIL` and `EDITORIAL_EMAIL` (defaults `billing@` and `editorial@searchable.pk` apply when unset), `CLAIM_WHATSAPP_NUMBER` (default is a placeholder), `CF_ANALYTICS_TOKEN` (`/admin/metrics` says "not configured" until then). |
| Export | `.data/export.sql` from Supabase at 02:00 UTC 2026-09-19 (5,048 rows, 47 tables, idempotent upserts). |
| Turnstile | widgets `searchable-staging` and `searchable-production` exist; site keys are vars, secrets are set. |
| Resend | production webhook already subscribes to `email.received`, `email.bounced`, `email.complained` at `https://searchable.pk/api/webhooks/resend`; it keeps working unchanged because the hostname does not change. Staging has its own webhook. |
| DNS today | apex `A` 216.198.79.65 and 64.29.17.65 (Vercel, DNS-only); `www` CNAME to Vercel (DNS-only); `img` proxied to R2. |

## Founder steps, before the window (any time, nothing goes live)

1. Done 2026-09-19 08:30 UTC: full import, delta import, reindex, verify, contract suite, scripted slot. Two things learned: the reindex job takes about six minutes on production (one document at a time) and the HTTP call may drop before it answers, so confirm with `select count(*) from search_documents` (678 on 2026-09-19); and a delta import cannot replay deletes, so `--verify` after the freeze may show D1 with a few more rows than Postgres (drafts the slots discarded in between), which is harmless or removed by hand.
2. Set the missing secrets on the production Worker. The Resend key must have full access (receiving needs it):
   ```bash
   npx wrangler secret put RESEND_API_KEY --env production
   ```
   Optional, same form: `BILLING_EMAIL`, `EDITORIAL_EMAIL`, `CLAIM_WHATSAPP_NUMBER`, `CF_ANALYTICS_TOKEN`. The editorial task's existing key is already on the Worker.
3. Done (see 1). To repeat the checks at any time (replace `<key>` with the production `ADMIN_API_KEY`):
   ```bash
   BASE_URL=https://searchable-production.sooviaan.workers.dev ADMIN_API_KEY=<key> npm run search:reindex
   ```
   ```bash
   DATABASE_URL=<Supabase transaction pooler URL, port 6543> npm run db:export -- --verify searchable
   ```
4. Done (see 1). To repeat:
   ```bash
   CONTRACT_BASE_URL=https://searchable-production.sooviaan.workers.dev CONTRACT_ADMIN_KEY=<key> npm run contract
   ```
   ```bash
   BASE_URL=https://searchable-production.sooviaan.workers.dev ADMIN_API_KEY=<key> npx tsx scripts/fake-slot.ts
   ```
5. The day before: in the Cloudflare dashboard (DNS), lower the TTL of the apex `A` records and the `www` CNAME to 5 minutes. Create an API token if you want the session to drive DNS and Rules next time (Zone DNS Edit, Zone Config Rules Edit, Zone Cache Purge, Account Analytics Read, Account Web Analytics Edit).

## The window

1. **Content freeze.** Pause both Cowork scheduled tasks. Disable cron-job.org job 8459170.
2. **Delta import.** Rows changed since the export:
   ```bash
   DATABASE_URL=<Supabase 6543 URL> npm run db:export -- --since 2026-09-19T02:00:00Z
   ```
   ```bash
   npx wrangler d1 execute searchable --remote --file .data/export.sql -y
   ```
   Then the reindex from step 3 once more (six minutes; confirm by count), and `--verify` for extras.
3. **Un-fence production** in `wrangler.jsonc` `env.production`: `EMAIL_PROVIDER` to `"resend"`, delete `JOBS_DISABLED`, set `"workers_dev": false`, and add the custom domain:
   ```jsonc
   "routes": [{ "pattern": "searchable.pk", "custom_domain": true }]
   ```
   Commit on `d1`.
4. **DNS.** In the dashboard delete the two apex `A` records (Vercel). Then deploy; wrangler creates the apex record and certificate for the custom domain:
   ```bash
   NEXT_PUBLIC_SITE_URL=https://searchable.pk npm run deploy:production
   ```
   Change `www` from the Vercel CNAME to a proxied `AAAA 100::` (any proxied record works; it exists only so the redirect rule can run).
5. **Rules** (dashboard, Rules): a Redirect Rule "www to apex": when hostname equals `www.searchable.pk`, dynamic redirect to `concat("https://searchable.pk", http.request.uri.path)`, status **301**, preserve query string. Turn on Always Use HTTPS (SSL/TLS, Edge Certificates) and HSTS (max-age six months, include subdomains off until img and staging are checked).
6. **Scheduler.** Same `CRON_SECRET` as the production Worker, then deploy:
   ```bash
   npx wrangler secret put CRON_SECRET -c workers/scheduler/wrangler.jsonc --env production
   ```
   ```bash
   npm run deploy:scheduler:production
   ```
7. **Checks.** Replay the Phase 0 captures from `docs/INVENTORY.md`: `curl -sI http://searchable.pk/` (301 to https), `curl -sI https://www.searchable.pk/` (301 to apex), `curl -s -o /dev/null -w "%{http_code}" https://searchable.pk/api/admin/context -H "Authorization: Bearer <key>"` (200, no redirect). Then the contract suite and the scripted slot against `https://searchable.pk`, and `/admin/system` in the browser (errors, database size). Fire each cron once through the scheduler (`POST https://searchable-scheduler-production.<subdomain>.workers.dev/run/<cron>` with the `CRON_SECRET`) and read `GET /api/admin/ingest/status`. Send one newsletter test: `POST /api/admin/newsletter {"id": "<issue>", "sendTestTo": "<you>"}`.
8. **Resume.** Re-enable the Cowork tasks with the updated prompt (new key if you did not carry the old one over; the API contract is unchanged, `docs/ADMIN-API.md`). First run read-only: `/context`, `/reference`, `/queue`, report.
9. **Rollback** at any point: put the two apex `A` records back (Vercel) and remove the Worker route from `wrangler.jsonc`; Supabase is untouched until step 2 of "after", so nothing is lost except writes made on D1 during the window. Triggers: any contract failure, a failed slot run, more than three new error fingerprints in 24 hours.

## After 72 hours stable

1. `git checkout main && git merge --ff-only d1 && git push` (or make `d1` the default branch); delete `vercel.json`.
2. Vercel: pause the project (Vercel connector `pause_project`), delete a week later.
3. Supabase: `pg_dump` to R2 under `backups/`, pause the project, delete a week later. Rotate the database password first (it was pasted in chat on 2026-09-19).
4. Delete the R2 bucket `searchable-response-store-cache-bodies` (empty since its one-day lifecycle rule).
5. Attach `staging.searchable.pk`: add `"routes": [{ "pattern": "staging.searchable.pk", "custom_domain": true }]` to the default environment in `wrangler.jsonc` and deploy; keep `NOINDEX=1` there.
6. Cloudflare Web Analytics: turn on for the zone (Analytics & Logs, Web Analytics, automatic setup); the beacon is injected on proxied responses, no code.
7. Update the scheduled tasks' prompt if anything about the report cadence changes; the six-day soak on `/admin/automation` starts here (definition of done in the plan).
