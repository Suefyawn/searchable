# Local → Production

The local prototype uses PGlite. Production uses Supabase Postgres + Vercel. **The application code does not change** — only environment variables and a few adapters.

## What changes

| Concern | Local | Production | Where |
|---|---|---|---|
| Database | `DATABASE_URL=pglite://./.data/pglite` | `DATABASE_URL=postgres://…supabase.co:5432/postgres` (use the **session pooler / direct** URL for migrations, the **transaction pooler** URL for the app) | `.env.local` / Vercel env |
| Auth secret | any 32+ char string | generated secret | `BETTER_AUTH_SECRET` |
| Base URL | `http://localhost:3000` | `https://searchable.pk` | `NEXT_PUBLIC_SITE_URL`, `BETTER_AUTH_URL` |
| Email | writes `.eml` files to `.data/outbox/` | Resend | `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` |
| Media uploads | `public/uploads/` | Supabase Storage bucket `media` | `STORAGE_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Analytics | first-party table only | + PostHog | `NEXT_PUBLIC_POSTHOG_KEY` |
| Errors | console | Sentry | `SENTRY_DSN` |
| Bot protection | off | Cloudflare Turnstile | `TURNSTILE_SECRET_KEY` |

## Go-live checklist (Phase 2, Days 31–45)

### Accounts to create (in this order)
1. GitHub — push the repo (private).
2. Supabase — new project, region **Singapore (ap-southeast-1)** or **Mumbai** for Pakistan latency.
3. Vercel — import the GitHub repo.
4. PKNIC — confirm `searchable.pk` ownership; you will set nameservers or A/CNAME records.
5. Resend — add domain `searchable.pk` (sending from `daily@searchable.pk`, `hello@searchable.pk`).
6. Google Search Console + Bing Webmaster Tools.
7. PostHog (EU or US cloud), Sentry.
8. Cloudflare (optional but recommended for DNS + Turnstile + WAF).

### Database
```bash
# 1. Point at Supabase (direct connection for migrations)
export DATABASE_URL="postgres://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# 2. Apply committed migrations
npm run db:migrate

# 3. Seed reference data ONLY (locations, categories, entities, tools metadata) — not sample articles/businesses
SEED_MODE=reference npm run db:seed

# 4. Rebuild search index
npm run search:reindex
```
Enable in Supabase: `pg_trgm` extension (Phase 5), Point-in-Time Recovery, and a daily backup check.

### Vercel
- Framework preset: Next.js. Node 22.
- Env vars from the table above (Production + Preview scopes; Preview points at a Supabase **branch** or a second free project).
- Add domain `searchable.pk` and `www.searchable.pk` (redirect www → apex).
- Enable Vercel Analytics + Speed Insights (free tier).

### DNS (at PKNIC or Cloudflare)
```
A     @     76.76.21.21        (Vercel)
CNAME www   cname.vercel-dns.com
TXT   @     resend-verification…
MX    send  feedback-smtp… (Resend)
TXT   resend._domainkey   DKIM
TXT   _dmarc  v=DMARC1; p=quarantine; rua=mailto:dmarc@searchable.pk
```

### First deploy verification
- [ ] `https://searchable.pk` renders home; `/sitemap.xml`, `/robots.txt` OK
- [ ] Search returns results; a tool computes; an article renders with JSON-LD (test in Rich Results Test)
- [ ] Admin login works; publish an article; it appears on site within 60s
- [ ] Newsletter double opt-in email arrives via Resend
- [ ] Lighthouse mobile ≥ 90 on home, article, tool, business
- [ ] Submit sitemaps to GSC + Bing

### Rollback
Vercel → Deployments → Promote previous. Database migrations are forward-only; write a compensating migration rather than editing history.

## Optional: Supabase local with Docker
If Docker Desktop is installed later, `supabase init && supabase start` gives a local Supabase stack. Set `DATABASE_URL` to the printed local Postgres URL and everything works unchanged. PGlite remains the default because it needs nothing running.
