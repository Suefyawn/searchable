# Local to production

Local runs on PGlite with files on disk. Production is **Vercel (Hobby for now) + Supabase Postgres (free) + Cloudflare R2 for images (free) + Resend for email (free)**. The application code does not change; only environment variables do. The budget logic that keeps us inside the free tiers is in `docs/FREE-TIER.md`.

`npm run preflight` reads the environment and prints what is still missing. Run it with the production variables before the first deploy.

## 1. Accounts, in this order
1. **GitHub**: done, `Suefyawn/searchable`, branch `main`.
2. **Supabase**: one project, free plan. Ours is `searchablepk` in ap-northeast-1 (Tokyo); Mumbai or Singapore would be closer for a new one.
3. **Cloudflare**: the domain's DNS, an R2 bucket (`searchable-images`) with a public custom domain (`img.searchable.pk`), an R2 API token (object read and write on that bucket), Web Analytics, Turnstile (later).
4. **Resend**: verify `searchable.pk` (DKIM, SPF, DMARC records go in Cloudflare DNS). Sending from `daily@searchable.pk`. Enable receiving (MX record) so every @searchable.pk address lands in `/admin/inbox`; the API key must be **full access** because the receiving endpoints need it. Add a webhook for `email.received` pointing at `https://searchable.pk/api/webhooks/resend` and put its signing secret in `RESEND_WEBHOOK_SECRET` (optional: without it the inbox syncs every 5 minutes instead of instantly).
5. **Vercel**: import the GitHub repo. Framework Next.js, Node 22. Hobby plan is fine until there is revenue (it forbids commercial use; move to Pro or Cloudflare Workers when ads or paid listings start).
6. **cron-job.org** (free): pings `/api/cron/publish` every 5 minutes so scheduled publishing and newsletters are exact; Hobby crons run once a day.
7. Later: Google Search Console, Bing Webmaster Tools, Google News Publisher Center, AdSense.

## 2. Environment variables for Vercel (Production)
```
NEXT_PUBLIC_SITE_URL=https://searchable.pk
NEXT_PUBLIC_SITE_NAME=Searchable
BETTER_AUTH_URL=https://searchable.pk
BETTER_AUTH_SECRET=<openssl rand -hex 32>

# Supabase: Connect > Transaction pooler (port 6543) for the app
DATABASE_URL=postgres://postgres.<ref>:<password>@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres

CRON_SECRET=<openssl rand -hex 24>
ADMIN_API_KEY=<openssl rand -hex 32>   # the scheduled editorial task, docs/DAILY-TASK.md

EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...            # full access (receiving needs it)
RESEND_WEBHOOK_SECRET=whsec_...  # optional, instant inbox
EMAIL_FROM="Searchable <daily@searchable.pk>"
EMAIL_DAILY_CAP=95
EMAIL_MONTHLY_CAP=2900
EMAIL_BULK_RESERVE=15
BILLING_EMAIL=billing@searchable.pk
EDITORIAL_EMAIL=editorial@searchable.pk
CLAIM_WHATSAPP_NUMBER=+92 3xx xxxxxxx

STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=<cloudflare account id>
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=searchable-images
R2_PUBLIC_URL=https://img.searchable.pk

INDEXNOW_KEY=<32 hex chars>
SEED_ADMIN_EMAIL=<your admin email>
SEED_ADMIN_PASSWORD=<strong password, change after first login>

# Off until approved / wanted
NEXT_PUBLIC_ADSENSE_CLIENT=
OPENVERSE_CLIENT_ID=
OPENVERSE_CLIENT_SECRET=
```
Preview deployments can reuse the same variables with a second free Supabase project, or simply be disabled.

## 3. Database, from this machine
```bash
# Session pooler (port 5432) for migrations and scripts; the app uses 6543
export DATABASE_URL="postgres://postgres.<ref>:<password>@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres"
export SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=...

npm run db:migrate                 # applies drizzle/0000 to 0011
SEED_MODE=reference npm run db:seed   # locations, categories, entities, synonyms, data series, tools, admin user; no sample articles or businesses
npm run search:reindex
npm run preflight                  # should print "Ready to deploy"
```
In Supabase: Database > Extensions > enable `pg_trgm` before reindexing (search needs it). Turn on daily backups (free plan keeps 7 days).

## 4. First deploy checks
- [ ] `/`, `/sitemap.xml`, `/news-sitemap.xml`, `/robots.txt`, `/llms.txt`, `/feed.xml`, `/indexnow-key.txt` respond.
- [ ] Sign in at `/login` with the seeded admin; open `/admin` and `/admin/system` (it shows host, storage, email and budget).
- [ ] `/admin/data` > Fetch now: petrol, USD, KIBOR, gold, KSE-100 and BTC fill from live sources.
- [ ] Upload a photo in the article editor: it lands on `img.searchable.pk` with 480 and 960 renditions.
- [ ] Publish an article; it appears on `/news` within a minute and shows up in `/search`.
- [ ] Subscribe to the newsletter with your own address: the confirmation arrives from Resend.
- [ ] Send a mail to hello@searchable.pk from your phone: it appears in `/admin/inbox` (instantly with the webhook, within 5 minutes without); reply from there and check it threads.
- [ ] `curl -H "authorization: Bearer $CRON_SECRET" https://searchable.pk/api/cron/publish` returns `ran: true`; add that URL to cron-job.org every 5 minutes with the header.
- [ ] Search Console and Bing: verify (HTML tag method: put the token in `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` and redeploy, or add their DNS TXT records in Cloudflare), submit both sitemaps; check the IndexNow key URL.
- [ ] Rich Results test on one tool page, one data page, one professional profile.

## 5. Photos and content
- The 65 seeded Openverse photos live in local `public/uploads/`; re-run `npm run db:seed-images` against production once R2 is configured, or upload through admin.
- Import real businesses with email addresses (`/admin/businesses/import`), then switch on claim outreach (`/admin/outreach`).

## 6. Rollback
Vercel > Deployments > Promote the previous one. Migrations are forward-only: write a compensating migration rather than editing history.

## 7. When revenue starts
Vercel Hobby forbids commercial use. At that point either Vercel Pro (USD 20 a month) or Cloudflare Workers Paid (USD 5 a month, OpenNext adapter, Hyperdrive to the same Supabase database). The code is host-agnostic apart from `vercel.json` crons.
