# Architecture

## Shape

One Next.js 16 application serves everything: public site, admin, business dashboard, API routes, and background jobs. There is no separate backend. It runs on Cloudflare Workers through vinext (ADR-41); D1 is the only database (ADR-45), R2 holds images and the page cache.

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router)                                    │
│                                                             │
│  src/app/*           public pages , RSC, cached, SEO       │
│  src/app/admin       CMS + ops    , server actions, auth   │
│  src/app/api         JSON + auth  , route handlers         │
│                                                             │
│  src/lib             domain logic (content, directory,      │
│                      search, seo, newsletter, geo)          │
│  src/tools           tool registry + calculators (pure TS)  │
│  src/db              Drizzle schema, client, queries        │
│  src/components      design system + feature components     │
└───────────────┬─────────────────────────────────────────────┘
                │ Drizzle
        ┌───────┴────────┐
        │  D1 (SQLite)   │  local: wrangler's D1 in .wrangler/state (npm run dev)
        │                │  prod : searchable, staging: searchable-staging
        └────────────────┘
```

## Data access rules

1. **All reads/writes go through `src/db`** (Drizzle). No raw SQL in components.
2. **Server Components read directly** from `src/lib/*` query functions. No client-side data fetching for public pages.
3. **Mutations are Server Actions** in `src/app/**/actions.ts` (a one-line admin toggle may sit inline in its page), validated with Zod, guarded by `requireRole()`. Only actions are exported from a `"use server"` file; helpers live elsewhere, because every export of such a file is a public endpoint.
4. **Anything that must be callable from outside** (newsletter confirm, search suggest, webhooks) is an `app/api` route handler.
5. **Search index is write-through:** every content/directory mutation calls `syncSearchDocument()` (through the `index*()` helpers in `src/lib/indexers.ts`). `scripts/reindex.ts` rebuilds from scratch.
6. **Per-request memoisation:** getters that both `generateMetadata` and the page body call (`getArticle`, `getBusiness`, `getCity`, `readSiteSettings`, …) are wrapped in React `cache()`, so a render runs each query once.

## Runtime-specific code

Everything that differs between Node (Vercel, `next dev`, scripts) and Cloudflare Workers sits in one module pair: `src/lib/platform.ts` and `src/lib/platform.workerd.ts` (bindings, the WebAssembly image codecs, fonts). The vinext build swaps one for the other (`vite.config.ts`, ADR-41); nothing else in `src/` asks where it runs. Images are decoded, scaled and encoded in WebAssembly (`src/lib/image-resize.ts`, ADR-42).

## Database client (`src/db/index.ts`)

```
DB binding (D1)  → drizzle-orm/d1, one Drizzle instance per isolate
```

There is no connection to pool or close. `rawQuery()` returns rows and turns `Date` parameters into epoch milliseconds; `rawRun()` returns the number of changed rows. Nothing in Node opens the database: scripts call the admin API of a running instance (`scripts/_api.ts`), and `scripts/export-for-d1.ts` is the one Postgres client, for the content migration.

## Auth (better-auth)

- Email + password; sessions in D1; `users.role` ∈ `user | editor | admin | business_owner`.
- `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (client), route at `/api/auth/[...all]`.
- `requireUser()` / `requireRole('admin')` helpers for server components and actions; `allowed(user, op, resource, {own})` asks the policy matrix in `packages/authz` (ADR-47). `npm run check:authz` fails CI when an action file or API route authorises nothing.
- Cloudflare Turnstile on sign-up, sign-in and the public forms: `<Turnstile/>` from `src/components/turnstile.tsx` inside the form, `verifyTurnstile()` in the action. Off when `TURNSTILE_SECRET` is unset.
- Business owners are `users` linked to `businesses` through `business_claims` (status=approved).

## Caching

- Public pages: `revalidate` (ISR) plus `revalidatePath()` on the paths a write touches; publishing an article purges the article, its section and the homepage. A site-wide `revalidatePath("/", "layout")` is reserved for chrome changes (brand, identity, breaking bar), because ISR writes are the metered line (docs/FREE-TIER.md).
- Search: `/search` is dynamic and noindex; `/api/search` and `/api/suggest` are CDN-cached for two and thirty minutes. Full text is FTS5 (`search_fts`, `search_trgm`), kept in step by triggers (`migrations/0001_search_fts.sql`).
- Data series: ISR one hour, purged by the ingestion cron when a reading changes.

## Rendering strategy per route

| Route | Strategy |
|---|---|
| `/` | ISR 900 |
| `/news/**`, `/guides/**` | ISR (hubs 900, categories 3600, articles 86400), purged on publish |
| `/tools/**` | Static shell with the server-computed default result; the calculator module loads on demand (`src/tools/load.ts`) and runs client-side |
| `/businesses/**`, `/b/[slug]`, `/cities/**` | ISR 3600 |
| `/search` | Dynamic |
| `/admin/**`, `/account/**` | Dynamic, no cache |

## SEO plumbing

`src/lib/seo.ts`, `buildMetadata()` (title template, canonical, OG, Twitter, markdown alternate), `*JsonLd()` helpers per schema type, `breadcrumbJsonLd()`. One sitemap in `src/app/sitemap.ts` (hourly) plus `/news-sitemap.xml`; `robots.txt` is a route so it can carry Content Signals (ADR-37).

## Security

- Every response carries `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and a CSP of `frame-ancestors 'none'; object-src 'none'; base-uri 'self'` (`next.config.ts`); calculator pages allow framing for `?embed=1`. A script CSP is not workable with AdSense, so the page is protected by escaping instead.
- Editor markdown (`renderMarkdown`) keeps raw HTML; member markdown (`renderUserMarkdown`: posts, bios) shows it as text. Both refuse every href scheme except http(s), mailto and tel. Search snippets are escaped before `ts_headline`.
- Invoice pages need the signed link from the email (`orderPath()`), the buying account or an admin. Cron routes compare `CRON_SECRET` in constant time and are closed in production without it. The admin API accepts the `ADMIN_API_KEY` environment variable (constant-time compare) or a key made at `/admin/api-keys`, looked up by its SHA-256 (`src/lib/api-keys.ts`); keys carry a role and are revoked by a timestamp, never deleted.
- Rate limiting is in memory per instance (`src/lib/rate-limit.ts`); a shared store is the next step if abuse shows up (ADR-39).

## Observability

- `analytics_events` table (first-party): page_view (sampled), search, tool_run, business_click, newsletter_subscribe, error (uncaught server errors from `src/instrumentation.ts` and browser crashes from the error page); `/admin/system` groups the last 24 hours.
- Microsoft Clarity on the client when `NEXT_PUBLIC_CLARITY_ID` is set. No PostHog, no Sentry (docs/FREE-TIER.md).

## Background jobs

`scripts/*.ts` run with `tsx` (seed, reindex, migrate, preflight). `runDueJobs()` in `src/lib/jobs.ts` does the every-few-minutes work (scheduled publishing, newsletter sends, plan expiry, claim invites, digests, inbox sync) and is called from the two Vercel crons (`/api/cron/ingest` daily, `/api/cron/publish`), from admin page loads and from the live-feed regeneration, guarded to once per five minutes across instances by a settings row. An external pinger on `/api/cron/publish` makes it exact.

## Directory layout

```
src/
  app/
    <route>/           public routes sit directly under app/ (news, guides, tools, businesses, b, p, u, …)
    admin/             CMS and operations
    account/ business/ professional/   signed-in dashboards
    api/               route handlers (public JSON, admin API, cron, webhooks, md renditions)
    [...slug]/         static Markdown pages (src/content/pages.ts) and the redirects table
    sitemap.ts proxy.ts (markdown negotiation) robots.txt/ feed.xml/ og/ llms.txt/
  components/
    ui/                primitives (button, input, card, badge, JsonLd, …)
    layout/            header, footer, mega nav, search box
    admin/ community/ compare/ data/ directory/ home/ professionals/ today/ tools/ upload/
    article-page.tsx cards.tsx img.tsx section-pages.tsx …
  db/
    schema/            one file per domain; index.ts re-exports
    index.ts           client factory (PGlite or postgres-js by DATABASE_URL)
    queries/           read functions for content, data, directory, entities, geo
  lib/                 flat, named by domain: <domain>.ts (reads), <domain>-actions.ts (server actions),
                       <domain>-schema.ts (zod), search.ts, seo.ts, markdown.ts, jobs.ts, today/ (daily pages)
  tools/
    registry.ts        all tools, by slug + category (server)
    load.ts            one calculator on demand (client)
    types.ts
    data/              versioned rate tables (tax slabs, tariffs, fuel, FX spreads…) with source and review date
    calculators/       one file per tool, file name = slug
scripts/
  migrate.ts seed.ts reindex.ts reset.ts preflight.ts
drizzle/               generated SQL migrations (committed)
docs/
```
