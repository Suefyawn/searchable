# SEARCHABLE.PK: MASTER SPECIFICATION

> **Status:** Living document. Source of truth for product, content, and engineering.
> **Version:** 0.1, Day 0 (2026-09-15)
> **Owner:** Founder
> **Companion docs:** `docs/ROADMAP-1000-DAYS.md` · `docs/ARCHITECTURE.md` · `docs/DATABASE.md` · `docs/URL-ARCHITECTURE.md` · `docs/TOOLS-FRAMEWORK.md` · `docs/SEARCH.md` · `docs/CONTENT-OPERATIONS.md` · `docs/LOCAL-TO-PRODUCTION.md` · `docs/DECISIONS.md`

---

## 1. Identity

| | |
|---|---|
| **Name** | Searchable |
| **Domain** | searchable.pk |
| **Tagline** | Find what you need. Know what matters. |
| **One-liner** | Pakistan's information platform. |
| **Mission** | Make useful information about Pakistan easy to find, understand and use. |
| **Vision** | Become Pakistan's most useful digital information platform: the searchable information layer for the country. |
| **Category** | Media + data + local discovery + utility platform. **Not** a blog. **Not** a news site. **Not** a directory. All of them, unified by search. |

### Brand promise
Someone types a real question, *"PTA tax on iPhone 17"*, *"restaurants in DHA Lahore"*, *"income tax on 250,000 salary"*, *"how to become a filer"*, and Searchable answers it with the right **kind** of answer: a tool, a business, a guide, a number, or a story.

### Two-level branding
```
SEARCHABLE                       ← master brand
├── Searchable News
├── Searchable Tools    (sub-brand candidate: HisabLao)
├── Searchable Business
├── Searchable Guides
├── Searchable Data
├── Searchable Compare
├── Searchable Jobs     (Phase 3)
├── Searchable Events   (Phase 3)
├── Searchable Deals    (Phase 3)
├── Searchable Daily    (newsletter)
└── Ask Searchable      (AI, Phase 4)
```

### Audience
1. **Everyday Pakistanis** with a practical question (tax, bills, cars, property, government processes).
2. **Local searchers** looking for a business or service in their city/area.
3. **Informed readers** who want news *with the useful context around it*.
4. **Business owners** who want to be found (supply side of the directory).
5. **Overseas Pakistanis** dealing with remittances, property, NADRA, taxes from abroad.

### What Searchable is NOT
- Not a breaking-news race against Geo/Dawn/ARY. We win on *useful information around what happened*.
- Not 5,000 AI-generated pages nobody needs. Every indexed page must answer a real query.
- Not a WordPress site. It is an application with structured data at its core.

---

## 2. Product pillars

```
                         SEARCHABLE.PK
                              │
       ┌──────────────────────┼───────────────────────┐
      KNOW                  FIND                     DO
     News                 Businesses               Tools
     Guides               Places                   Calculators
     Data                 Services                 Checkers
     Explainers           Products                 Converters
       └──────────────────────┼───────────────────────┘
                          DISCOVER
                   Jobs · Events · Deals · Compare
                              │
                           CONNECT
                   Newsletter · Accounts · Follows
                              │
                          AI SEARCH
```

| Pillar | Route | Core entity | MVP? |
|---|---|---|---|
| News | `/news` | `articles` (kind=news) | ✅ Day 1 |
| Guides | `/guides` | `articles` (kind=guide) | ✅ Day 1 |
| Tools | `/tools` | `tools` + code registry | ✅ Day 1 |
| Businesses | `/businesses` | `businesses` | ✅ Day 1 (skeleton) |
| Cities | `/cities` | `locations` | ✅ Day 1 |
| Data | `/data` | `data_series` + `data_points` | Phase 2 |
| Compare | `/compare` | `comparisons` | Phase 2 |
| Jobs / Events / Deals | `/jobs` `/events` `/deals` | own tables | Phase 3 |
| Newsletter | `/newsletter` | `newsletter_subscribers` | ✅ Day 1 (capture) |
| Search | `/search` | `search_documents` | ✅ Day 1: **the center** |
| Ask Searchable | `/ask` | RAG over everything | Phase 4 |

---

## 3. The core idea: search is the product

The homepage is not "Latest News". It is:

```
┌────────────────────────────────────────────────────┐
│  What do you want to know?                         │
│  🔍  ________________________________________      │
│                                                    │
│  Try: PTA tax on iPhone · dollar rate today ·      │
│       solar companies Lahore · become a filer      │
└────────────────────────────────────────────────────┘
```

Search must be **federated** from day one: one query hits articles, guides, tools, businesses, locations, and (later) data series, comparisons, jobs, events, deals. Every entity writes itself into a single `search_documents` table with a `tsvector`. Ranking = relevance × type-boost × freshness × popularity.

Later intelligence: intent detection (*tool / place / explainer / number / story*), entity extraction (*iPhone, Lahore, FBR*), location extraction, typo tolerance, synonyms (Urdu/English/Roman-Urdu), autocomplete, trending.

---

## 4. Entities are the foundation (knowledge graph)

Every important noun in Pakistan becomes an **entity** row: `Apple`, `Toyota`, `FBR`, `NADRA`, `PTA`, `Meezan Bank`, `Lahore`, `Gold`, `USD`, `K-Electric`. Articles, tools, guides, businesses, data series, and comparisons link to entities via `entity_links`. An entity page (`/e/fbr`) aggregates everything Searchable knows about it. This is what eventually makes Searchable infrastructure rather than a website, and what makes "Ask Searchable" possible without hallucination.

---

## 5. URL architecture (locked from Day 1)

See `docs/URL-ARCHITECTURE.md` for the full tree. Summary:

```
/                                  home = search
/search?q=                         federated search
/news                              /news/[category]        /news/[category]/[slug]
/guides                            /guides/[category]      /guides/[category]/[slug]
/tools                             /tools/[category]       /tools/[category]/[slug]
/businesses                        /businesses/[category]  /businesses/[category]/[city]   /b/[slug]
/cities                            /cities/[city]          /cities/[city]/[area]
/data                              /data/[series]          (Phase 2)
/compare                           /compare/[slug]         (Phase 2)
/e/[entity]                        entity hub
/newsletter                        subscribe / manage
/account  /business/dashboard  /admin
```

Rules: lowercase, hyphenated slugs; no dates in URLs; no trailing slashes; category before slug; city pages only exist when they contain ≥ N real listings (no thin pages).

---

## 6. Technical architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, RSC, Turbopack) | SEO-first server rendering, one codebase for site + admin + API |
| Language | TypeScript (strict) | |
| Styling | Tailwind v4 + hand-rolled component primitives (shadcn-compatible) | |
| ORM | **Drizzle** | SQL-shaped, type-safe, generates real migrations |
| Database (local) | **PGlite**: real Postgres compiled to WASM, embedded, zero install | Docker is not on this machine; PGlite gives genuine Postgres semantics (tsvector, generated columns, JSONB) with nothing to run |
| Database (prod) | **Supabase Postgres** | Same schema, same migrations, same Drizzle code; only `DATABASE_URL` changes |
| Auth | **better-auth** (email/password, roles) | Works identically against PGlite and Supabase; keeps auth out of the DB vendor |
| Email | Resend (prod) / file outbox (local) | |
| Analytics | PostHog (prod) + first-party `analytics_events` | |
| Hosting | Vercel | |
| Storage | local `/public/uploads` → Supabase Storage / S3 later | |
| Search | Postgres FTS now → Typesense/Meilisearch only when needed | |

**Principle:** *Architecture for scale, infrastructure for current needs.* Full details in `docs/ARCHITECTURE.md`; migration path in `docs/LOCAL-TO-PRODUCTION.md`.

### Environments
```
local (PGlite, this laptop)  →  preview (Vercel preview + Supabase branch)  →  production
```

---

## 7. Database model (summary)

Full description in `docs/DATABASE.md`. Grouped:

- **Identity:** `users`, `sessions`, `accounts`, `verifications` (better-auth), `organizations`, `organization_members`
- **Content:** `articles` (kind: news | guide | explainer | page), `categories` (scoped by kind), `tags`, `article_tags`, `authors`, `article_revisions`
- **Tools:** `tools`, `tool_runs` (anonymised usage)
- **Directory:** `businesses`, `business_categories`, `business_hours`, `business_services`, `business_photos`, `business_reviews`, `business_claims`, `business_leads`
- **Geography:** `locations` (self-referential: country → province → city → area, with lat/lng)
- **Knowledge graph:** `entities`, `entity_links`
- **Data platform:** `data_series`, `data_points`
- **Audience:** `newsletter_subscribers`, `newsletter_issues`
- **Search:** `search_documents` (federated index), `search_queries` (log), `search_synonyms`
- **SEO/Platform:** `redirects`, `media`, `analytics_events`, `settings`
- **Phase 2/3:** `comparisons`, `jobs`, `events`, `deals`, `follows`, `saved_items`

---

## 8. Tools framework

Tools are **code + metadata**, not hand-built pages. Each tool is a TypeScript module implementing:

```ts
interface ToolDefinition<I, O> {
  slug: string; name: string; category: string;
  description: string; keywords: string[];
  version: string; lastReviewed: string; sources: Source[];
  fields: Field[];                               // drives the generic form
  compute(input: I): O;
  explain(input: I, output: O): Explanation;     // human-readable breakdown
  methodology: string;                           // markdown
  faqs: FAQ[];
  related: { tools?: string[]; guides?: string[]; entities?: string[] };
}
```

A generic `/tools/[category]/[slug]` page renders the form from `fields`, runs `compute` (client-side, instant), shows `explain`, methodology, sources, FAQs, and related content, and emits JSON-LD. Rates/thresholds live in versioned config (`src/tools/data/*.ts`) so FY changes are a data edit, not a rewrite. Full spec: `docs/TOOLS-FRAMEWORK.md`.

**First 50 tools** (Days 101–150): Finance 10 · Tax 10 · Cars 10 · Property 5 · Utilities 5 · Government 5 · Solar 5. The prototype ships 6 as proof of the framework.

---

## 9. Content engine

- **Kinds:** news, guide, explainer, page. Same table, different workflows and templates.
- **Workflow:** draft → research → editing → fact-check → scheduled → published → updated. Status enum on `articles`; every publish creates a revision.
- **Editor:** Markdown + structured fields in the admin; block editor later.
- **Every article must link** to ≥ 1 tool, guide, business category, or entity. The internal-link graph *is* the SEO strategy.
- **Data pipeline rule:** one piece of information → seven products (data point → page → chart → calculator → article → newsletter → social). See `docs/CONTENT-OPERATIONS.md`.

---

## 10. Business directory

- Public: category × city landing pages, business profile pages with NAP, WhatsApp, hours, services, photos, reviews, map.
- Supply: add / claim / verify workflow; owner dashboard (edit, photos, services, respond to reviews, leads, analytics).
- Trust: verification badge, duplicate detection, closed flag, report flows.
- Data quality gates: a category×city page is only indexable with ≥ 5 listings (`noindex` otherwise).

---

## 11. Newsletter: Searchable Daily

Capture from Day 1 (email + topic prefs). Send from Day ~300. Structure: top stories · what changed · useful number · business spotlight · tool of the day · trending · one thing worth knowing. Provider: Resend (prod). Local: emails written to `.data/outbox/`.

---

## 12. Data platform (Phase 2)

Structured Pakistani time-series: petrol, diesel, gold, USD/PKR and other FX, electricity tariffs, tax slabs, policy rate, car prices, property indices. Each series has a page, a chart, an API, and feeds tools + articles + newsletter.

---

## 13. SEO engine

Built-in from Day 1: canonical URLs, dynamic sitemaps per entity type, `robots.txt`, Open Graph + Twitter cards, JSON-LD (`Article`, `NewsArticle`, `HowTo`, `FAQPage`, `LocalBusiness`, `WebApplication`, `BreadcrumbList`, `Dataset`), breadcrumbs, `redirects` table, `noindex` rules for thin pages, `lastmod` from `updated_at`.

---

## 14. AI policy

**Internal employee first, public chatbot later.** Internal uses (Phase 1–2): research briefs, news monitoring, article drafts *for human editing*, fact extraction, SEO suggestions, internal-link suggestions, business categorisation/enrichment, translation (EN ⇄ UR), newsletter assembly, search-query classification, moderation. Public **Ask Searchable** (Phase 4) is a retrieval interface over Searchable's own structured data, it calls tools, queries the directory, cites guides and data series. It never answers from model memory alone.

---

## 15. Monetization by stage

| Days | Focus | Revenue |
|---|---|---|
| 0–300 | Audience + data | None expected |
| 300–500 | First revenue | sponsored listings, business upgrades, affiliate |
| 500–700 | Directory business | premium tiers, leads, newsletter sponsorship |
| 700–1000 | Platform | subscriptions, data/API products, advertising, premium AI, business SaaS |

Tiers: Free → Verified → Premium → Sponsored; plus per-lead pricing.

---

## 16. Roadmap (summary)

Full plan with exit criteria per phase: `docs/ROADMAP-1000-DAYS.md`.

```
Day 0        Master spec (this document)
Day 1–30     LOCAL PROTOTYPE, foundation, schema, design system, core pages, search, CMS, 6 tools, seed data
Day 31–45    Go-live prep: Supabase, Vercel, domain, email, analytics, first public deploy
Day 46–100   News + Guides + Tools engine hardened; first 50 tools; first 500 businesses
Day 101–200  Business directory + owner accounts; location engine
Day 201–300  Search intelligence; newsletter launch
Day 301–500  Data platform; comparisons; local search; reviews & trust
Day 501–700  Jobs; events; deals; business monetization
Day 701–850  Ask Searchable (AI); personalization
Day 851–1000 Mobile/PWA; scale; Searchable 1.0
```

---

## 17. Daily operating system (two tracks, every day)

**Track A, Product:** develop → test → SEO → performance → security → data → automation.
**Track B, Media/Growth:** research → news → guide → tool/data → social → newsletter → business acquisition.

Weekly cadence: Mon content planning · Tue tools/data · Wed directory · Thu evergreen SEO · Fri newsletter · Sat product · Sun analytics + planning. Monthly KPI review. Details in `docs/CONTENT-OPERATIONS.md`.

---

## 18. KPIs and content targets (directional)

| Day | Articles | Guides | Tools | Businesses | Subscribers |
|---|---|---|---|---|---|
| 100 | 100–200 | 20–30 | 30–50 | 500+ | 500 |
| 250 | 500+ | 75+ | 75+ | 5,000+ | 3,000 |
| 500 | 1,500+ | 150+ | 150+ | 20,000+ | 15,000 |
| 750 | 3,000+ | 250+ | 250+ | 50,000+ | 40,000 |
| 1000 | 5,000+ | 300+ | 300+ | 75,000+ | 100,000 |

Dashboard metrics: monthly users · organic traffic · indexed pages · ranking keywords · searches/day · tool runs · business clicks/leads · newsletter open/click · verified businesses.

Quality beats these numbers. Every number above is subordinate to: *"Is this the place people go when they need something about Pakistan?"*

---

## 19. Risks

| Risk | Mitigation |
|---|---|
| Thin/duplicate content penalties | `noindex` gates; every page must answer a query; human review |
| Directory data rot | verification cadence, owner claims, closed flags, last-verified dates |
| Wrong tax/tariff numbers | versioned rate tables with sources + review dates; "last reviewed" on every tool |
| Solo-founder burnout | the two-track daily system is designed to be *bounded*; automation first |
| Vendor lock-in | Drizzle migrations + better-auth keep the app portable off Supabase |
| Search relevance disappointing | start with Postgres FTS + boosts; upgrade to a dedicated engine only when measured |

---

## 20. Decision log

Key architectural decisions and their rationale are recorded as ADRs in `docs/DECISIONS.md`. Add an entry whenever a choice here changes.
