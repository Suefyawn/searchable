# Architecture Decision Records

Format: **ADR-n · Title** — Status · Date. Context → Decision → Consequences.

---

## ADR-1 · One Next.js app, no separate backend
**Accepted · 2026-09-15**
Context: Solo founder; site + admin + API + jobs. Decision: single Next.js 16 App Router codebase; Server Components for reads, Server Actions for writes, route handlers for external calls. Consequences: one deploy, one type system, no API contract drift. Revisit only if a non-JS consumer needs a stable API (then expose `/api/v1`).

## ADR-2 · Postgres is the only database; Drizzle is the ORM
**Accepted · 2026-09-15**
Context: Need FTS, JSONB, generated columns, real migrations, and a path to Supabase. Decision: Drizzle with the `postgresql` dialect; schema in TypeScript; SQL migrations committed under `drizzle/`. Consequences: portable across any Postgres host; no vendor SDK in domain code.

## ADR-3 · PGlite for local development instead of Docker/Supabase-local
**Accepted · 2026-09-15**
Context: Docker is not installed on the dev machine; the founder wants to build fully locally before opening any accounts. Decision: `@electric-sql/pglite` (Postgres compiled to WASM) persisted at `.data/pglite`, selected via `DATABASE_URL=pglite://…`. Consequences: zero-install, real Postgres semantics, same Drizzle code as production. Limits: single connection, no PostGIS (use lat/lng + haversine until Supabase), no Supabase Auth locally (→ ADR-4). If Docker is installed later, `supabase start` is a drop-in alternative; nothing in the app changes.

## ADR-4 · better-auth instead of Supabase Auth
**Accepted · 2026-09-15**
Context: ADR-3 removes Supabase Auth locally; two auth systems would be worse than one. Decision: better-auth with the Drizzle adapter; email/password first, OAuth (Google) later; `users.role` for authorisation. Supabase is used as managed Postgres (+ Storage), not as an auth provider. Consequences: identical auth locally and in prod; portable. Trade-off: no Supabase RLS-based row security — authorisation lives in server code (`requireRole`), which is where it belongs for an RSC app that never exposes the DB to the browser.

## ADR-5 · Search is a single write-through index table
**Accepted · 2026-09-15**
Context: Federated search across 6+ entity types must exist on Day 1. Decision: `search_documents(entity_type, entity_id, url, title, summary, body, city, category, tsv, boost, published_at)` with a generated `tsvector`; every mutation upserts its document; ranking in SQL. Consequences: one query, one ranking function, trivially re-indexable; swappable for Typesense/Meili by re-implementing `src/lib/search.ts` only.

## ADR-6 · Tools are code, configured by versioned data
**Accepted · 2026-09-15**
Context: 300 calculators cannot be hand-built pages; tax tables change yearly. Decision: `ToolDefinition` interface; generic renderer; rate tables in `src/tools/data/*` with `effectiveFrom` + `source`; tool metadata mirrored into `tools` table for search/SEO. Consequences: a new tool is one file; a FY change is a data edit + review date bump.

## ADR-7 · Articles: one table, `kind` column
**Accepted · 2026-09-15**
Context: news, guides, explainers share 90% of fields and the same workflow. Decision: single `articles` table with `kind` enum and `categories.kind` scoping. Consequences: one editor, one search doc type with sub-type boost, simple cross-linking.

## ADR-8 · Locations are a self-referential tree
**Accepted · 2026-09-15**
Decision: `locations(id, parent_id, kind: country|province|city|area, slug, name, lat, lng)`. City × category pages resolve `city` from this table. Consequences: areas, districts, tehsils fit without schema changes.

## ADR-9 · Entities as first-class knowledge graph nodes
**Accepted · 2026-09-15**
Decision: `entities` + polymorphic `entity_links(entity_id, target_type, target_id, relation)`. Consequences: entity hubs and later AI grounding come for free from linking discipline in the editor.

## ADR-10 · No dates in URLs; `/b/[slug]` for businesses
**Accepted · 2026-09-15** — see `docs/URL-ARCHITECTURE.md`.

## ADR-11 · npm, not pnpm/yarn
**Accepted · 2026-09-15** — already installed; nothing else to set up. Revisit if the repo becomes a monorepo.

## ADR-12 · Design system is hand-rolled primitives, shadcn-compatible
**Accepted · 2026-09-15**
Context: The user asked for a clean, modern, highly readable UI. Decision: Tailwind v4 tokens in `globals.css`; small set of primitives in `src/components/ui` following shadcn conventions (`cn()`, variants) so shadcn components can be dropped in later without restyling. Consequences: no CLI dependency in the scaffold; full control of typography and spacing.

## ADR-13 · `marked` for Markdown, `@tailwindcss/typography` for prose
**Accepted · 2026-09-15**
Context: Articles and guides are authored in Markdown by trusted editors; the site needs excellent reading typography. Decision: `marked` (small, fast, GFM) renders on the server; `@tailwindcss/typography` `prose` classes style the output with our tokens. Consequences: no client-side Markdown; editor content is trusted (admin-only) — if user-generated Markdown is ever rendered, add sanitisation (`DOMPurify`/`rehype-sanitize`) first.
