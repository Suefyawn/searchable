# Architecture

## Shape

One Next.js 16 application serves everything: public site, admin, business dashboard, API routes, and background scripts. There is no separate backend. Postgres is the only stateful dependency.

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router)                                    │
│                                                             │
│  src/app/(site)      public pages , RSC, cached, SEO       │
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
        │  Postgres      │  local: PGlite (embedded, .data/pglite)
        │                │  prod : Supabase
        └────────────────┘
```

## Data access rules

1. **All reads/writes go through `src/db`** (Drizzle). No raw SQL in components.
2. **Server Components read directly** from `src/lib/*` query functions. No client-side data fetching for public pages.
3. **Mutations are Server Actions** in `src/app/**/actions.ts`, validated with Zod, guarded by `requireRole()`.
4. **Anything that must be callable from outside** (newsletter confirm, search suggest, webhooks) is an `app/api` route handler.
5. **Search index is write-through:** every content/directory mutation calls `upsertSearchDocument()` in the same transaction. `scripts/reindex.ts` rebuilds from scratch.

## Database client (`src/db/index.ts`)

```
DATABASE_URL = pglite://./.data/pglite   → drizzle-orm/pglite  (dev, tests)
DATABASE_URL = postgres://…              → drizzle-orm/postgres-js (Supabase, CI)
```

A `globalThis` singleton prevents duplicate PGlite instances across HMR. `@electric-sql/pglite` is marked as a server-external package in `next.config.ts`.

## Auth (better-auth)

- Email + password; sessions in Postgres; `users.role` ∈ `user | editor | admin | business_owner`.
- `src/lib/auth.ts` (server), `src/lib/auth-client.ts` (client), route at `/api/auth/[...all]`.
- `requireUser()` / `requireRole('admin')` helpers for server components and actions.
- Business owners are `users` linked to `businesses` through `business_claims` (status=approved).

## Caching

- Public pages: `revalidate` (ISR) with tag-based invalidation, publishing an article calls `revalidateTag('articles')` and the specific path.
- Search: no cache (personal, cheap in Postgres). Suggest endpoint: 60s.
- Data series (Phase 2): cache until next ingestion.

## Rendering strategy per route

| Route | Strategy |
|---|---|
| `/` | Static + revalidate 300 (trending, latest) |
| `/news/**`, `/guides/**` | ISR, revalidate on publish |
| `/tools/**` | Static shell; calculator runs client-side |
| `/businesses/**`, `/b/[slug]`, `/cities/**` | ISR 3600 |
| `/search` | Dynamic |
| `/admin/**`, `/account/**` | Dynamic, no cache |

## SEO plumbing

`src/lib/seo.ts`, `buildMetadata()` (title template, canonical, OG, Twitter), `jsonLd()` helpers per schema type, `breadcrumbs()`. `src/app/sitemap.ts` composes per-type sitemaps; `src/app/robots.ts`.

## Observability

- `analytics_events` table (first-party): page_view (sampled), search, tool_run, business_click, newsletter_subscribe.
- Prod adds PostHog (client) + Sentry (server + client).

## Background jobs

Phase 1: `scripts/*.ts` run with `tsx` (seed, reindex, migrate). Phase 2+: Vercel Cron → `app/api/cron/*` (data ingestion, newsletter assembly, sitemap ping). Phase 6+: queue (Upstash QStash or BullMQ on Redis) for heavy work.

## Directory layout

```
src/
  app/
    (site)/            public routes grouped for a shared layout
    admin/             CMS
    api/               route handlers
    sitemap.ts robots.ts
  components/
    ui/                primitives (button, input, card, badge, …)
    layout/            header, footer, nav, search bar
    content/           article card, article body, guide TOC
    directory/         business card, hours, contact
    tools/             tool renderer, field inputs, result blocks
  db/
    schema/            one file per domain; index.ts re-exports
    index.ts           client factory
    queries/           reusable read functions per domain
  lib/
    auth.ts seo.ts slug.ts format.ts search.ts newsletter.ts geo.ts
  tools/
    registry.ts        all tools, by slug + category
    types.ts
    data/              versioned rate tables (tax slabs, tariffs…)
    calculators/       one file per tool
scripts/
  migrate.ts seed.ts reindex.ts reset.ts
drizzle/               generated SQL migrations (committed)
docs/
```
