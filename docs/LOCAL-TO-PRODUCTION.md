# Local to production

Everything runs on Cloudflare: the Worker (vinext build of the Next.js app), D1 (database), R2 (images, page cache), Cron Triggers and Workflows (Phase 4), Turnstile (ADR-47), Analytics Engine (Phase 7). Resend sends and receives email. The application code is the same everywhere; only bindings and secrets differ between `wrangler.dev.jsonc` (development), the default environment in `wrangler.jsonc` (staging) and its `production` environment. Cost and allowances: `docs/FREE-TIER.md`; decisions: ADR-41 to ADR-47.

## 1. Local development

1. `npm install`. Node 22.
2. Create `.dev.vars` (gitignored) with `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, `NEXT_PUBLIC_SITE_NAME=Searchable`, `BETTER_AUTH_URL=http://localhost:3000`, `BETTER_AUTH_SECRET=<openssl rand -hex 32>`, `ADMIN_API_KEY=<openssl rand -hex 32>`, `EMAIL_PROVIDER=local`, `STORAGE_PROVIDER=local`, `HEAVY_COMPUTE=1`.
3. `npm run db:migrate` applies `migrations/` to wrangler's local D1 in `.wrangler/state`.
4. `npm run dev` starts the vinext dev server on http://localhost:3000 against that database, using `wrangler.dev.jsonc` (no Response Store Durable Object; pages are served uncached in development).
5. In another terminal, `SEED_MODE=sample SEED_ADMIN_EMAIL=admin@searchable.pk SEED_ADMIN_PASSWORD=<8+ chars> npm run db:seed` fills reference data, sample content and the admin account through the admin API, then rebuilds the search index. `npm run search:reindex` rebuilds it alone.
6. `npm test` runs the pure-function checks (no database). `npm run typecheck && npm run lint && npm run build` is what CI runs.

A copy of production content is the better development database: `.data/export.sql` from step 4 below imports with `npx wrangler d1 execute searchable-staging --local --file .data/export.sql`, followed by `npm run search:reindex`.

## 2. Accounts

1. **GitHub**: `Suefyawn/searchable`. `main` is the Vercel line until cutover; `d1` is the Workers line (ADR-45). Hotfixes are cherry-picked between them until `d1` becomes `main`.
2. **Cloudflare** (one account, Workers Paid, ADR-44): the `searchable.pk` zone; Workers `searchable` (staging) and `searchable-production`; D1 `searchable-staging` and `searchable`; R2 `searchable-images` (public at img.searchable.pk), `searchable-page-cache`, `searchable-production-page-cache`. `wrangler login` once per machine.
3. **Resend**: `searchable.pk` verified, sending and receiving. Webhook for `email.received` (plus `email.bounced`, `email.complained` from Phase 8) at `https://searchable.pk/api/webhooks/resend`; its signing secret is `RESEND_WEBHOOK_SECRET`.
4. Later: Google Search Console, Bing, Google News Publisher Center, AdSense (unchanged from before).

## 3. Bindings and configuration

`wrangler.jsonc` holds every binding and public variable per environment: `DB` (D1), `MEDIA` (R2 images), `CACHE_BODIES` and `CACHE_METADATA` (Response Store), `ASSETS`, and the vars `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_NAME`, `BETTER_AUTH_URL`, `STORAGE_PROVIDER=r2`, `R2_PUBLIC_URL=https://img.searchable.pk`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `HEAVY_COMPUTE=1`, `TURNSTILE_SITE_KEY` (one Turnstile widget per environment; the matching `TURNSTILE_SECRET` is a secret). Staging adds `NOINDEX=1` and `JOBS_DISABLED=1`.

Secrets are set with `wrangler secret put <NAME>` (add `--env production` for production) and never written down: `BETTER_AUTH_SECRET`, `ADMIN_API_KEY` (the same value the scheduled editorial task uses; keys made at `/admin/api-keys` work as well), `CRON_SECRET`, `RESEND_API_KEY` (full access, receiving needs it), `RESEND_WEBHOOK_SECRET`, `INDEXNOW_KEY` (32 hex), `BILLING_EMAIL`, `EDITORIAL_EMAIL`, `CLAIM_WHATSAPP_NUMBER`, `GOOGLE_SITE_VERIFICATION`, `TURNSTILE_SECRET`, `CF_ANALYTICS_TOKEN` (Phase 7).

## 4. Database

- Migrations: `npm run db:generate` after a schema change writes `migrations/NNNN_*.sql`; hand-written SQL (FTS tables, triggers) goes in its own numbered file. Apply with `npm run db:migrate` (local), `npm run db:migrate:staging`, `npm run db:migrate:production`. Wrangler records applied files in the database's `d1_migrations` table.
- Content migration from Supabase (once, and again for the delta at cutover): `DATABASE_URL=<Supabase transaction pooler, port 6543> npm run db:export` writes `.data/export.sql` (idempotent upserts; `-- --since <ISO time>` limits it to rows changed after the Phase 2 snapshot). Import with `npx wrangler d1 execute <db> --remote --file .data/export.sql`, rebuild search with `BASE_URL=<host> ADMIN_API_KEY=<key> npm run search:reindex`, then `npm run db:export -- --verify <db>` compares every table's count and ten random rows column by column.
- Sessions, verifications and the search index are not exported; the first two are re-created on use, the last by the reindex.

## 5. Deploy

- `NEXT_PUBLIC_*` values are inlined into the browser bundle at build time from the shell (or `.env.local`), not from `wrangler.jsonc`. Build with `NEXT_PUBLIC_SITE_URL=https://staging.searchable.pk npm run build` for staging and `NEXT_PUBLIC_SITE_URL=https://searchable.pk npm run build` for production; anything the browser must read per environment is a runtime var instead (the Turnstile site key travels in a meta tag).
- Staging: `npm run build && npm run deploy` publishes the default environment to https://searchable.sooviaan.workers.dev (custom domain staging.searchable.pk once its DNS record exists). Staging reads its own D1 and is fenced from side effects (`JOBS_DISABLED`, `EMAIL_PROVIDER=none`, `NOINDEX`).
- Production: `npm run deploy:production` publishes the `production` environment. Until cutover its route stays unattached; Phase 9 of the migration plan attaches `searchable.pk`.
- Check with `curl -I`: a page answers with `cache-control` and, on a warm cache, in well under a second; `npx wrangler tail searchable --format json` shows CPU and wall time per request and any exception.

## 6. Cutover (Phase 9 of the migration plan)

Between the Night and Dawn slots: final `db:export -- --since`, import, reindex, replace the apex `A` records with the production Worker's custom domain (TTL lowered the day before), Redirect Rule `www` to apex (301) and Always Use HTTPS, contract suite against production, a scripted slot run, one cron of each, one newsletter test, then the Cowork tasks resume with their updated prompt. Rollback is restoring the DNS records; Vercel and Supabase stay warm for 72 hours, then are paused and deleted a week later.
