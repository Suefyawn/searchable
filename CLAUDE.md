# Searchable.pk: instructions for coding agents (Codex, Claude Code, etc.)

Read `SEARCHABLE_MASTER_SPEC.md` first. Then the doc for the area you are touching in `docs/`.

## Stack
Next.js 16 (App Router, RSC, Server Actions) on Cloudflare Workers via vinext · TypeScript strict · Tailwind v4 · Drizzle ORM · Cloudflare D1 (SQLite; wrangler's local D1 in development) · R2 · better-auth · Zod 4 · npm.

## Commands
```
npm run dev            # vinext dev server with a local D1, http://localhost:3000 (needs .dev.vars, see docs/LOCAL-TO-PRODUCTION.md)
npm run db:migrate     # apply migrations/ to the local D1 (db:migrate:staging, db:migrate:production for the remote ones)
npm run db:generate    # generate a migration after editing src/db/schema (hand-written SQL such as FTS: `npx drizzle-kit generate --custom --name <x>` reserves the numbered file, then fill it)
npm run db:seed        # reference + sample data through the admin API of the running dev server (SEED_MODE, SEED_ADMIN_*)
npm run search:reindex # rebuild the search index through the admin API of the running instance (BASE_URL)
npm run db:export      # Supabase -> .data/export.sql for the content migration (DATABASE_URL); -- --verify <db> compares
npm test              # pure-function checks, no database (calculators, slugs, markdown, webhook signatures, WebP headers, no em dashes)
npm run typecheck && npm run lint && npm run build
npm run deploy         # staging Worker; npm run deploy:production for the production environment
```

## Rules
1. **Schema changes:** edit `src/db/schema/*.ts` (sqlite-core; enums via `textEnum`/`enumColumn` plus a CHECK, JSON via `json()`, timestamps via `timestampMs()`, see `docs/schema-notes.md`) → `npm run db:generate` → commit the SQL in `migrations/` → `npm run db:migrate`. Never hand-edit generated SQL. Raw SQL is SQLite: no casts, epoch-millisecond timestamps, `json_extract` for JSON.
2. **Data access** only through `src/db` + `src/lib/*` query functions (public pages; an admin page may run its own Drizzle query for a one-off listing). Server Components read; Server Actions write; Zod-validate every action input; guard with `requireRole()`. Export only actions from a `"use server"` file: every export there is a public endpoint.
3. **Search:** any create/update/delete of an article, tool, business, location, or entity must call `syncSearchDocument()` / `removeSearchDocument()` from `src/lib/search.ts`.
4. **New tool:** add `src/tools/calculators/<slug>.ts` implementing `ToolDefinition`, register it in `src/tools/registry.ts`, add rate data under `src/tools/data/` with `effectiveFrom` and `source`. Run `npm run db:seed` to mirror metadata into the `tools` table.
5. **URLs** follow `docs/URL-ARCHITECTURE.md` exactly. A changed public URL needs a `redirects` row.
6. **SEO:** every public page exports `generateMetadata` via `buildMetadata()` and renders JSON-LD via `<JsonLd/>`. Thin pages set `robots: noindex`.
7. **Design:** use primitives from `src/components/ui`; tokens from `globals.css`. Readability first: 16–18px body, ≤ 70ch measure, generous spacing, strong hierarchy. No component library CLIs; no inline hex colours.
8. **No client-side data fetching** on public pages (the one exception: the home live feed refreshes from `/api/feed` at the CDN interval). `"use client"` only for interactivity (search box, tool forms, editors). Member-written Markdown renders through `renderUserMarkdown()`, never `renderMarkdown()`.
9. **Money & rates** live in versioned data files with sources, never inline constants in calculators.
10. **No em dashes, anywhere.** Not in site copy, tool text, docs, commit messages or UI strings. Use a comma, colon, full stop, parentheses or a plain hyphen. (Founder rule: em dashes read as machine-written.) Ranges may use a hyphen or en dash (2026-27, Rs 1.5-3 lakh).
11. **Runtime differences** (Workers vs Node) go only in `src/lib/platform.ts` and `src/lib/platform.workerd.ts`; never import `cloudflare:workers`, `node:fs` writes or WebAssembly modules anywhere else.
12. Keep files small and named by domain. Match surrounding style. Do not add dependencies without an ADR in `docs/DECISIONS.md`.
