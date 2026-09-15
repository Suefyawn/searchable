# Searchable.pk: instructions for coding agents (Codex, Claude Code, etc.)

Read `SEARCHABLE_MASTER_SPEC.md` first. Then the doc for the area you are touching in `docs/`.

## Stack
Next.js 16 (App Router, RSC, Server Actions) · TypeScript strict · Tailwind v4 · Drizzle ORM · Postgres (PGlite locally via `DATABASE_URL=pglite://…`, Supabase in prod) · better-auth · Zod 4 · npm.

## Commands
```
npm run dev            # http://localhost:3000
npm run db:migrate     # apply drizzle/ migrations to DATABASE_URL
npm run db:generate    # generate a migration after editing src/db/schema
npm run db:seed        # seed reference + sample data
npm run db:reset       # wipe .data/pglite, migrate, seed
npm run search:reindex # rebuild search_documents
npm run typecheck && npm run lint && npm run build
```

## Rules
1. **Schema changes:** edit `src/db/schema/*.ts` → `npm run db:generate` → commit the SQL in `drizzle/` → `npm run db:migrate`. Never hand-edit generated SQL; never use `db:push` against production.
2. **Data access** only through `src/db` + `src/lib/*` query functions. Server Components read; Server Actions write; Zod-validate every action input; guard with `requireRole()`.
3. **Search:** any create/update/delete of an article, tool, business, location, or entity must call `syncSearchDocument()` / `removeSearchDocument()` from `src/lib/search.ts`.
4. **New tool:** add `src/tools/calculators/<slug>.ts` implementing `ToolDefinition`, register it in `src/tools/registry.ts`, add rate data under `src/tools/data/` with `effectiveFrom` and `source`. Run `npm run db:seed` to mirror metadata into the `tools` table.
5. **URLs** follow `docs/URL-ARCHITECTURE.md` exactly. A changed public URL needs a `redirects` row.
6. **SEO:** every public page exports `generateMetadata` via `buildMetadata()` and renders JSON-LD via `<JsonLd/>`. Thin pages set `robots: noindex`.
7. **Design:** use primitives from `src/components/ui`; tokens from `globals.css`. Readability first: 16–18px body, ≤ 70ch measure, generous spacing, strong hierarchy. No component library CLIs; no inline hex colours.
8. **No client-side data fetching** on public pages. `"use client"` only for interactivity (search box, tool forms, editors).
9. **Money & rates** live in versioned data files with sources, never inline constants in calculators.
10. **No em dashes, anywhere.** Not in site copy, tool text, docs, commit messages or UI strings. Use a comma, colon, full stop, parentheses or a plain hyphen. (Founder rule: em dashes read as machine-written.) Ranges may use a hyphen or en dash (2026-27, Rs 1.5-3 lakh).
11. Keep files small and named by domain. Match surrounding style. Do not add dependencies without an ADR in `docs/DECISIONS.md`.
