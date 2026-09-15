# Searchable.pk — 1,000-Day Roadmap

> Day 0 = 2026-09-15. Days are calendar days. Every phase has **deliverables**, **exit criteria**, and a **content track** that runs in parallel — the site is never empty while the product is being built.
>
> Guiding rule: *build the full architecture early, populate progressively.*

---

## Phase map

| Phase | Days | Theme | Exit signal |
|---|---|---|---|
| 0 | 0 | Master spec | `SEARCHABLE_MASTER_SPEC.md` exists |
| 1 | 1–30 | **Local prototype** | Runs on the laptop end-to-end with seed data |
| 2 | 31–45 | **Go live** | searchable.pk serves real pages from Supabase + Vercel |
| 3 | 46–100 | Content engines | 100+ articles, 20+ guides, 30+ tools, 500 businesses |
| 4 | 101–200 | Directory + locations | Owner accounts, claims, city × category pages |
| 5 | 201–300 | Search intelligence + newsletter | Intent-aware search; Searchable Daily sending |
| 6 | 301–500 | Data + compare + local search + trust | Data series live; reviews with moderation |
| 7 | 501–700 | Jobs · Events · Deals · monetization | First recurring revenue from businesses |
| 8 | 701–850 | Ask Searchable + personalization | AI answers grounded in Searchable data |
| 9 | 851–1000 | Mobile · scale · 1.0 | PWA, infra hardened, Searchable 1.0 |

---

## Phase 1 — Local prototype (Days 1–30)  ← **WE ARE HERE**

Everything runs on this machine with **PGlite** (embedded Postgres). No accounts, no hosting, no cost. The goal is a prototype good enough to judge the product, not a demo.

### Week 1 (Days 1–7): Foundation
- [x] Repo, Next.js 16, TypeScript strict, Tailwind v4, ESLint
- [x] Drizzle schema for all Phase 1–2 entities (content, tools, directory, locations, entities, newsletter, search, platform)
- [x] DB client factory: `pglite://` locally, `postgres://` in production — same code
- [x] Migrations + seed script with realistic Pakistani data
- [x] better-auth (email/password) with `role` on users; admin gate
- [x] Design system: tokens, typography, primitives (button, input, card, badge, nav, footer, empty/loading states)

### Week 2 (Days 8–14): Core platform
- [x] Homepage = search
- [x] Global header/footer, mobile nav
- [x] Federated search (`search_documents` + tsvector + type boosts) and `/search` page
- [x] Category/topic/location routing
- [x] SEO engine: metadata helper, canonicals, OG, JSON-LD, breadcrumbs, `sitemap.xml`, `robots.txt`
- [x] 404 / error states

### Week 3 (Days 15–21): Content + tools
- [x] `/news`, `/guides` with categories and article pages
- [x] Tools framework (registry, generic renderer, explain/methodology/FAQ/sources)
- [x] 6 launch tools: Income Tax (FY2025-26), PTA Mobile Tax, Zakat, Electricity Bill (LESCO-style slabs), Car Loan / Lease, Salary Breakdown
- [x] Admin CMS: article list/create/edit/publish; business list; newsletter subscribers; search log

### Week 4 (Days 22–30): Directory + polish
- [x] `/businesses` category → city listing → business profile
- [x] `/cities` hierarchy (province → city → area)
- [x] Newsletter capture with topics + local outbox
- [x] Entity hubs (`/e/[slug]`)
- [x] Production build passes (`npm run build`); lint + typecheck clean
- [ ] Lighthouse ≥ 90 on mobile for home, article, tool, business pages
- [ ] Founder review: is this the product? Adjust the spec.
- [ ] Verify every rate table in `src/tools/data/` against its primary source (PTA slabs, NEPRA tariff, EOBI) before go-live
- [ ] Replace sample news (`scripts/seed-data/news.ts`) with real daily pieces written in the CMS
- [x] Path-based pagination (`/news/page/2`) so hubs are fully cacheable
- [x] RSS feed at `/feed.xml`
- [x] Rate limiting on newsletter, tool-run, lead, submission, contact and search endpoints
- [x] 11 tools (added home loan, fuel cost, AC running cost, plot size converter)

**Exit criteria:** `npm run db:reset && npm run dev` gives a browsable site with search returning mixed results, 6 working calculators, 10+ articles, 20+ businesses across 3 cities, and an admin where a new article can be published without touching code.

**Content track (start Day 1, even locally):** write 1 real news piece + 1 guide per day into the CMS. By Day 30: 30 news, 15 guides, drafted in the real editor. They go live with the first deploy.

---

## Phase 2 — Go live (Days 31–45)

| Day | Task |
|---|---|
| 31 | Create Supabase project; run Drizzle migrations; verify schema parity |
| 32 | Set `DATABASE_URL` to Supabase in a `.env.production`; run seed for locations + categories only |
| 33 | Vercel project; env vars; preview deploy on `*.vercel.app` |
| 34 | Domain: point `searchable.pk` DNS (PKNIC) at Vercel; SSL |
| 35 | Resend: verify domain, DKIM/SPF/DMARC; newsletter confirm emails live |
| 36 | PostHog + Google Search Console + Bing Webmaster; submit sitemaps |
| 37 | Supabase Storage bucket for media; swap upload adapter |
| 38 | Rate limiting on search/newsletter/lead endpoints; bot protection (Turnstile) |
| 39 | Error monitoring (Sentry); uptime check |
| 40 | Backups verified (Supabase PITR); disaster-recovery note |
| 41–45 | Publish the 30 news + 15 guides written in Phase 1; announce; first social accounts |

**Exit criteria:** Public site, indexed by Google, first 100 organic impressions, first newsletter subscriber who is not you.

See `docs/LOCAL-TO-PRODUCTION.md` for the exact checklist.

---

## Phase 3 — Content engines (Days 46–100)

**Product**
- News categories: Pakistan · Politics · Business · Economy · Technology · AI · Science · Sports · Education · Health · Auto · Property · Lifestyle · World
- Guides: taxes · banking · cars · property · government · utilities · telecom · education · health · travel
- Tools engine hardened: versioned rate tables, shareable result URLs, embeddable widgets, JSON-LD `WebApplication`
- First 50 tools (Finance 10 · Tax 10 · Cars 10 · Property 5 · Utilities 5 · Government 5 · Solar 5)
- Article ↔ tool ↔ guide ↔ entity cross-linking enforced in the editor
- Internal AI assistant (server-side only): research briefs, draft outlines, SEO title/description suggestions, internal-link suggestions

**Content**
- 3–5 news pieces/day, 1 guide/day, 1 tool every 2 days
- Add 10 businesses/day (manual + import), verify by phone/WhatsApp

**Exit criteria:** 200 articles, 30 guides, 50 tools, 500 businesses, 500 subscribers, 1,000 organic clicks/month.

---

## Phase 4 — Directory + locations (Days 101–200)

- Business owner accounts: add / claim / verify (phone OTP + document), owner dashboard (edit, hours, services, photos, respond to reviews, leads, analytics)
- Location engine: full Pakistan hierarchy (provinces → 100+ cities → major areas), lat/lng, "near me"
- `/businesses/[category]/[city]` and `/cities/[city]/[category]` pages with `noindex` when < 5 listings
- Duplicate detection (name + phone + geo distance), closed-business flow, report flows
- Bulk import pipeline (CSV → validation → normalization → categorisation via AI → review queue)
- Maps (MapLibre + OSM tiles; Google Maps only if needed)

**Exit criteria:** 5,000 businesses, 200 claimed, 50 category × city pages ranking on page 1–3.

---

## Phase 5 — Search intelligence + newsletter (Days 201–300)

**Search**
- Query understanding: intent (tool / place / explainer / number / story), entity + location extraction, category detection
- Synonyms (EN / UR / Roman Urdu), typo tolerance (`pg_trgm`), autocomplete, popular + trending searches
- Result blending rules per intent (e.g. "tax" → tool first; "near me" → businesses first)
- Search analytics dashboard: zero-result queries → content backlog

**Newsletter — Searchable Daily**
- Issue builder in admin (auto-assembled from the day's content + data + tool of the day; human edits)
- Preferences: daily/weekly, topics
- Resend broadcast + tracking; double opt-in; unsubscribe; suppression list
- First send Day ~250

**Exit criteria:** 60% of searches produce a click; newsletter open rate > 40%; 3,000 subscribers.

---

## Phase 6 — Data · Compare · Local search · Trust (Days 301–500)

- **Data platform:** `data_series` for petrol/diesel/HSD, gold (24k/22k per tola/10g), FX (USD/GBP/EUR/AED/SAR), policy rate, CPI, electricity tariffs, gas tariffs; ingestion jobs; history charts; JSON API; every series feeds a page + tool + auto-article on change
- **Compare:** cars, banks/accounts, credit cards, internet packages, mobile packages, universities, solar systems, insurance; structured spec tables + editorial verdict
- **Local search:** "restaurants near DHA Lahore" → category + area parse → map + list + hours + WhatsApp + directions
- **Reviews & trust:** ratings, owner responses, report review, moderation queue, verified badge, last-verified date
- Monetization begins: sponsored listings, affiliate links, business upgrades

**Exit criteria:** 20,000 businesses, 150 tools, 1,500 articles, 20 data series with daily updates, first paying businesses.

---

## Phase 7 — Jobs · Events · Deals · Monetization (Days 501–700)

- `/jobs`: business posts job; filters (city, remote, salary, industry, experience); alerts
- `/events`: categories, city pages, calendar, submissions
- `/deals`: business-published promotions with expiry; deal alerts by city/category
- Business tiers: Free → Verified → Premium → Sponsored; lead marketplace; newsletter sponsorship; category sponsorship
- Billing (Stripe where possible; local gateways — Safepay / PayFast — for PKR)

**Exit criteria:** Recurring monthly revenue; 50,000 businesses; 250 tools; 3,000 articles.

---

## Phase 8 — Ask Searchable + personalization (Days 701–850)

- **Ask Searchable:** retrieval-grounded assistant over Searchable's own index; tool-calling (runs calculators), directory queries, data lookups, guide citations; refuses to answer outside the index
- Accounts become useful: follow cities/topics/businesses/entities; saved tools/guides/businesses/jobs; "My Searchable" feed; personalised newsletter

**Exit criteria:** AI answers with citations for the top 1,000 queries; measurable lift in return visits.

---

## Phase 9 — Mobile · Scale · 1.0 (Days 851–1000)

- PWA excellence (offline tools, installable, push for followed topics); evaluate native apps
- Infra: Redis cache, queues/background workers, dedicated search engine if measured need, image CDN, read replicas, rate limiting, WAF, DR drills
- Data/API products for businesses and developers
- **Searchable 1.0** — the ecosystem in the spec, mature.

---

## Standing tracks (every phase)

| Track | Cadence | Notes |
|---|---|---|
| Content | Daily | 3–10 news, 1 evergreen, periodic tool/data update |
| Directory growth | Daily | add / verify / contact / moderate |
| SEO | Weekly | GSC review, internal links, refresh top pages |
| Newsletter | Daily from Phase 5 | prepared each night |
| Product | Daily | dev, bugs, perf |
| Analytics + planning | Weekly (Sun) + monthly | KPI dashboard in `/admin` |
| Security + backups | Monthly | dependency updates, access review, restore test |

## Technology evolution

| Days | Stack additions |
|---|---|
| 0–200 | Next.js · Drizzle · PGlite→Supabase · Vercel · Tailwind · better-auth · Resend · PostHog |
| 200–500 | Redis · queues · MapLibre · object storage · `pg_trgm` · scheduled jobs |
| 500–1000 | Dedicated search cluster (if needed) · analytics warehouse · data pipelines · AI/RAG · recommendations · event streaming |
