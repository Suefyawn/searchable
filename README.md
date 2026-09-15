# Searchable.pk

**Find what you need. Know what matters.** — Pakistan's information platform: news with context, step-by-step guides, calculators, a business directory, and structured data — all searchable in one place.

> Plan and specification: [`SEARCHABLE_MASTER_SPEC.md`](SEARCHABLE_MASTER_SPEC.md) · Roadmap: [`docs/ROADMAP-1000-DAYS.md`](docs/ROADMAP-1000-DAYS.md)

## Run it locally (nothing to install except Node)

```bash
npm install
cp .env.example .env.local      # already done for you
npm run db:migrate              # creates the embedded Postgres (PGlite) in .data/pglite
npm run db:seed                 # reference data + sample content + admin user
npm run dev                     # http://localhost:3000
```

Admin: **http://localhost:3000/admin** — `admin@searchable.pk` / `searchable-admin-123` (from `.env.local`).

Newsletter confirmation emails are written to `.data/outbox/*.eml` locally.

> **PGlite is single-process.** Stop `npm run dev` before running any `db:*` or `search:reindex` script (the scripts refuse to run otherwise).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` · `npm run lint` | Type and lint checks |
| `npm run db:generate` | Generate a SQL migration from `src/db/schema` |
| `npm run db:migrate` | Apply migrations in `drizzle/` |
| `npm run db:seed` | Seed (`SEED_MODE=reference` for production: no sample content) |
| `npm run db:reset` | Wipe local DB, migrate, seed |
| `npm run search:reindex` | Rebuild the federated search index |
| `npm run db:studio` | Drizzle Studio |

## What is here (Phase 1 prototype)

- **Search-first home**, federated search over news, guides, tools, businesses, places and topics (Postgres full-text with ranking, prefix matching, suggestions).
- **News & Guides** with categories, FAQ/Article JSON-LD, sources, topic links, related tools.
- **Tools framework** + 7 calculators: income tax (FY26 & FY25 slabs), take-home salary, PTA mobile tax, electricity bill, zakat, car loan, solar payback. Shareable result URLs; versioned rate tables with sources.
- **Business directory**: category → city → profile, verified badges, hours/open-now, WhatsApp, enquiries, add-business submissions, claims.
- **Cities** hierarchy (provinces → 20 cities → areas) and **entity hubs** (`/e/fbr`, `/e/gold`…).
- **Newsletter** capture with topics, double opt-in, unsubscribe.
- **Admin CMS**: dashboard, article editor with publish workflow + revisions + entity tagging, business moderation, claims/leads, subscribers, search log (zero-result queries = content backlog).
- **SEO**: canonical, OG/Twitter, JSON-LD, breadcrumbs, sitemap, robots, thin-page `noindex` gates.
- **Auth**: better-auth (email/password), roles `user · business_owner · editor · admin`.

## Going live

Follow [`docs/LOCAL-TO-PRODUCTION.md`](docs/LOCAL-TO-PRODUCTION.md). Only environment variables change: `DATABASE_URL` → Supabase, `EMAIL_PROVIDER=resend`, `NEXT_PUBLIC_SITE_URL=https://searchable.pk`.

## Docs

| | |
|---|---|
| [`SEARCHABLE_MASTER_SPEC.md`](SEARCHABLE_MASTER_SPEC.md) | Product, brand, pillars, architecture, policies — the source of truth |
| [`docs/ROADMAP-1000-DAYS.md`](docs/ROADMAP-1000-DAYS.md) | Phases 0–9 with deliverables and exit criteria |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | App shape, data access rules, caching, layout |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Every table and why it exists |
| [`docs/URL-ARCHITECTURE.md`](docs/URL-ARCHITECTURE.md) | The URL tree, locked from day 1 |
| [`docs/TOOLS-FRAMEWORK.md`](docs/TOOLS-FRAMEWORK.md) | How to add a calculator |
| [`docs/SEARCH.md`](docs/SEARCH.md) | How search indexes and ranks |
| [`docs/CONTENT-OPERATIONS.md`](docs/CONTENT-OPERATIONS.md) | Daily/weekly system, templates, editorial policy |
| [`docs/LOCAL-TO-PRODUCTION.md`](docs/LOCAL-TO-PRODUCTION.md) | Go-live checklist |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decision records |
| [`AGENTS.md`](AGENTS.md) | Rules for coding agents (Codex / Claude Code) |
