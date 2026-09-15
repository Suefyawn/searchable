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

## ADR-14 · Visual redesign: display typeface, soft surfaces, glass header
**Accepted · 2026-09-15**
Context: The founder judged the first pass "old fashioned". Decision: Bricolage Grotesque (display, variable opsz/wdth) for headings + Inter for body; warm off-white canvas with radial gradient glows on the hero; borderless cards with layered shadows and hover lift; pill buttons and chips; floating glass header; dark editorial footer; per-category colour accents for tools; live data ticker on the home page. Tokens live in `globals.css` (`surface`, `surface-hover`, `glass`, `eyebrow`, `text-gradient`, `hero-bg`). Consequences: every page inherits the language through primitives; dark mode is preserved via the same tokens; motion respects `prefers-reduced-motion`.

## ADR-15 · Minimal news design (supersedes ADR-14)
**Accepted · 2026-09-15**
Context: The founder wants Searchable to look like a news website — minimalistic and easy on the eyes — and rejected rounded buttons/fields and glossy effects as old-fashioned. Decision: Newsreader (serif) for headlines and deks; Inter for article body, UI and meta (founder preference: body must be sans). Square corners everywhere (all radius tokens are 0). Hairlines instead of cards and shadows; a heavier rule above section titles; small-caps sans labels; one quiet green accent for labels and links; near-black primary buttons; a classic masthead (date line, wordmark, section nav, small search) and a light footer. The home page is a front page: search bar, numbers strip, lead story + secondary column + latest headlines, calculators, guides, directory. Consequences: no gradients, glass, pills or entrance animations anywhere; new components should use `hairline`, `rule`, `eyebrow`, `headline-link`, `surface` (white + 1px border) from `globals.css`.

## ADR-16 · Image uploads: sharp → WebP, local disk now, Supabase Storage later
**Accepted · 2026-09-15**
Decision: `POST /api/upload` accepts JPEG/PNG/WebP/GIF/AVIF ≤ 8 MB, normalises with `sharp` (rotate, resize per variant: article 1800px, cover 2000px, photo 1600px, logo 512px; WebP q82; metadata stripped), records a `media` row, and stores via `putObject()` — `STORAGE_PROVIDER=local` writes `public/uploads/YYYY/MM/<uuid>.webp`; `supabase` uploads to the `media` bucket over the Storage REST API. Editors may upload anything; business owners only for businesses they manage. Consequences: one adapter to switch at go-live; images served through `next/image` with `remotePatterns` already open for the Supabase host.

## ADR-17 · Openly licensed photography via Openverse; never AI-generated imagery
**Accepted · 2026-09-15**
Context: The founder wants real, relevant photos and no AI-generated images anywhere. Decision: photos come from the Openverse API (Flickr, Wikimedia Commons, museums) restricted to CC0 / public domain / CC BY / CC BY-SA; every import stores creator, licence and source page in `media` and renders a credit line under the image. Editors pick photos in the article editor; `scripts/seed-images.ts` seeds articles, cities and categories. Consequences: attribution is a first-class field (`featuredImageCredit`, `imageCredit`); the Wikimedia API is unreachable from some networks but the image hosts are, so Openverse is the single search path; anonymous limit 200/day — register a client id at go-live.

## ADR-18 · Monetization: manual invoices first, gateway later; placement is sold, editorial never is
**Accepted · 2026-09-15**
Decision: `orders` (business plans, sponsored posts, placements) and `submissions` (guest / sponsored / press release) tables; prices in `src/content/pricing.ts`; invoices `SP-YYYY-NNNNNN` with bank / JazzCash / Easypaisa details; admin marks paid, which sets tier, expiry and verification; cron lapses plans. Sponsored articles carry a disclosure block, a Sponsored badge and `rel="sponsored"` on outbound links; free listings link `nofollow`, paid tiers follow. AdSense loads only when `NEXT_PUBLIC_ADSENSE_CLIENT` is set and never inside tools or search. Consequences: a card gateway (Safepay/PayFast) is another `provider` value on the same order; see `docs/MONETIZATION.md`.

## ADR-19 · Directory growth: CSV import, dedupe by phone/name/geo, area pages, click-to-load OSM map
**Accepted · 2026-09-15**
Decision: `src/lib/import.ts` parses CSV, validates rows, normalises phones to +92, resolves category/city/area by slug or name (with aliases), runs `findDuplicates()` (same phone → same name key in city → Dice ≥ 0.8 within 300 m / ≥ 0.9 in city) and previews before committing to the review queue. Admin can merge a duplicate (status `duplicate`, reviews/leads moved, 301 redirect). Area pages `/businesses/[category]/[city]/[area]` and `/cities/[city]/[area]` are `noindex` under 5 listings. Maps are a click-to-load OpenStreetMap iframe on profiles — no map library until local search needs multi-pin maps (MapLibre then). Consequences: `pg_trgm` is not required; dedupe runs in JS over the city's rows, which is fine to ~20k listings per city.

## ADR-20 · Light theme only; hero-first home page without a search box
**Accepted · 2026-09-15**
Context: The founder wants black-on-white, minimal and modern, and judged the search-box-first home "not suitable" and lacking a hero. Decision: the site ships light only — `--bg: #ffffff`, near-black type; the dark palette stays in `globals.css` but applies only under an explicit `data-theme="dark"` (Tailwind `dark:` is remapped to that attribute, the OS preference is ignored). Home: a thin scrolling numbers ticker, then a hero of the lead story (photo 7/12, headline stack 5/12 with three text headlines), then a four-up photo grid, calculators with example results, guides with thumbnails, directory, cities, newsletter. Search lives in the masthead only. Consequences: no per-component `dark:` classes are needed for new work; a theme toggle can be added later by setting the attribute.

## ADR-21 · Automated data ingestion from public sources with jump guards
**Accepted · 2026-09-15**
Decision: `src/lib/ingest.ts` pulls the data hub's core series daily (`/api/cron/ingest`, also "Fetch now" in `/admin/data`): SBP's economic-data page (USD/PKR M2M, 12-month KIBOR offer, policy rate), open.er-api.com cross rates for AED/SAR/GBP/EUR anchored on SBP's USD/PKR, PSO's fuel-price page (Premier Euro 5, Hi-Cetane diesel), and spot gold/silver from gold-api.com converted to per-tola PKR. A reading that moves more than 30% from the last stored value is held ("rejected") rather than published, so a parser break cannot poison the site; an editor can force it. Every auto reading carries a note naming the source and "(auto)". OGRA notifications remain the legal source for fuel prices and are PDFs; PSO's ex-depot price is what consumers pay and is parsed instead. CPI and solar per-watt stay manual. Consequences: seed values are illustrative placeholders replaced on first run; sources are third-party HTML and will need parser upkeep — failures surface in the admin panel, not silently.
