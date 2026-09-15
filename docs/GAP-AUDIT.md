# Gap audit: plan vs. built (updated 2026-09-15, evening)

Legend: ✅ built · 🟡 partial · ❌ missing. "Plan" = the original 1000-day plan + `docs/ROADMAP-1000-DAYS.md`. Money: see `docs/MONETIZATION.md`.

## Foundation
| Item | Status | Note |
|---|---|---|
| Repo, Next.js 16, TS strict, Tailwind v4, Drizzle, PGlite locally | ✅ | |
| UI primitives | ✅ | Hand-rolled, ADR-12/15 (minimal newspaper) |
| Supabase / Vercel / staging / production | ❌ | Deliberately deferred: founder will say when (`docs/LOCAL-TO-PRODUCTION.md`) |
| CI | ✅ | GitHub Actions: typecheck, lint, build |
| Env management | ✅ | `.env.example`; ads/Openverse/billing keys documented |
| Error monitoring | ❌ | Sentry at go-live |

## Database
| Entity | Status | Note |
|---|---|---|
| users, sessions, roles | ✅ | user · business_owner · editor · admin |
| authors | ✅ | Author pages `/authors/[slug]`, picker in editor |
| articles, categories, tags, revisions, related | ✅ | Tags rendered at `/tags/[slug]`; manual related + automatic |
| topics | ✅ | `entities` (knowledge graph) `/e/[slug]` |
| businesses + hours/services/photos/reviews/claims/leads | ✅ | |
| locations (province/city/area) | ✅ | Area pages routed and gated |
| tools, tool_runs | ✅ | Registry mirrored into `tools` table |
| media | ✅ | With licence + source for open-licence imports; `/admin/media` |
| newsletter subscribers + issues | ✅ | Builder, preview, test, send, schedule, cron |
| search_documents, synonyms, queries | ✅ | |
| redirects, reports, messages, settings, analytics_events | ✅ | |
| **orders, submissions** | ✅ | Plans, invoices, guest/sponsored pitches (`src/db/schema/commerce.ts`) |
| events, jobs, deals | ❌ | Phase 7 |

## Content engine (CMS)
| Feature | Status |
|---|---|
| Title, slug, dek, body (Markdown), category, author, city, entities, tags, sources, FAQs, SEO title/description, canonical, noindex, featured | ✅ |
| Featured image: upload **or openly licensed photo search (Openverse)** with credit + source saved and rendered | ✅ |
| Workflow draft → research → editing → fact-check → scheduled → published; revisions; draft preview | ✅ |
| Scheduling via cron; autosave | 🟡 scheduling ✅, autosave ❌ |
| Related articles (manual + automatic) | ✅ |
| **Sponsored flag, contributor byline/bio, `rel=sponsored` rewriting, disclosure block** | ✅ |
| OG images (dynamic) | ✅ |
| Internal AI assistant | ❌ | Phase 3 later |

## News / Guides / Tools
| Item | Status |
|---|---|
| Section, category, article routes with pagination, RSS | ✅ |
| Tools framework: fields, compute, methodology, sources, versions, JSON-LD, share URLs, live defaults from data | ✅ |
| Tools built | 🟡 24 of 50 (tax 4 · finance 9 · cars 4 · property 2 · utilities 2 · solar 1 · telecom 1 · government 1) |
| Embeddable widgets (`?embed=1` mode + copyable iframe snippet with attribution link) | ✅ |
| Hubs: `/pta`, `/electricity` + 11 DISCOs, `/electricity/net-metering`, `/data/solar-panel-price`, `/compare/solar-inverters` | ✅ |

## Directory
| Item | Status |
|---|---|
| Listings, profiles, claim, add, owner editor (hours/services/photos/logo/cover), reviews + owner replies, leads, click tracking, dashboard analytics | ✅ |
| **Paid tiers: Verified / Premium / Sponsored / category sponsor; upgrade flow; invoices; admin mark-paid; expiry cron; dofollow for paid** | ✅ |
| Report business / review / article | ✅ |
| Ownership claims: invite link (auto), website-domain code (auto), phone code (editor), document (editor); claim outreach drip with reminders and opt-out; unclaimed state on profiles; Verified upsell in the owner dashboard (ADR-25) | ✅ |
| Bulk CSV import with validation + dedupe preview; merge duplicates (redirect + move reviews); area pages (gated); OSM map on profiles | ✅ |
| "Near me" / multi-pin map search | ❌ | MapLibre when local search ships |

## Search
| Item | Status |
|---|---|
| Federated, ranked, prefix, autocomplete, popular, trending, city filter, synonyms (EN/Roman Urdu), search log + zero-result backlog | ✅ |
| Typo tolerance (`pg_trgm` trigram fallback + did-you-mean), intent detection (tool / place / explainer / number / story) with per-type rank blending | ✅ |
| Polish: instant answers (live figure, worked example), facet tabs with counts, grouped suggestions from a CDN-cached index, recent and popular searches, related searches, news sort, result click tracking, "/" hotkey | ✅ |

## Newsletter
| Item | Status |
|---|---|
| Capture, topics, frequency, double opt-in, unsubscribe, manage page | ✅ |
| Issue builder (numbers, stories, guide, tool of the day, trending), preview, test, send, schedule, cron | ✅ |
| Resend delivery + open/click tracking | 🟡 adapter ready; Resend at go-live |
| Sponsor slot | 🟡 markdown block; no product/booking yet |

## Data · Compare · Trust
| Item | Status |
|---|---|
| 14 data series, history, charts, stats, API, admin entry, city sections (gold), inflation | ✅ |
| Automated ingestion (SBP, er-api, PSO, spot gold/silver → 12 of 14 series; daily cron + Fetch now; 30% jump guard) | ✅ |
| Data → auto-drafted article on change (petrol, diesel, policy rate → draft news with worked numbers) | ✅ |
| Compare pages | 🟡 2 of 8 (new cars, solar inverters) + /compare hub; banks/packages next |
| Reviews + moderation + owner response + report | ✅ |

## Monetization & SEO
| Item | Status |
|---|---|
| AdSense integration (script, slots, placement policy, ads.txt), required policy pages | ✅ (off until env set) |
| Business plans + invoices + admin orders + revenue KPIs | ✅ |
| `/advertise` pricing page, `/write-for-us` guest/sponsored/press-release submissions, `/admin/submissions`, convert-to-draft | ✅ |
| Card gateway (Safepay / PayFast) | ❌ | plug-in `provider` on orders |
| Affiliate links + disclosure | 🟡 policy written; no partner links yet |
| SEO: Semrush keyword map, keyword-led titles, metadata, JSON-LD (9 types), sitemap, robots, canonicals, redirects, noindex rules, OG images, real credited photos | ✅ |
| AI and search readiness: llms.txt + llms-full.txt, Markdown renditions (/api/md), key facts + cite blocks, AI-crawler allow list, news sitemap, IndexNow, Discover robots meta, Person JSON-LD (docs/SEO-AI.md) | ✅ |
| World coverage: 30 press feeds (PK, world, US, markets, crypto, cricket, MMA, snooker, tech, entertainment), matching news categories, /admin/ideas one-click drafts, KSE-100/BTC/ETH series | ✅ |
| Search Console / Position Tracking | ❌ | after go-live |

## Design
| Item | Status |
|---|---|
| Minimal newspaper system (ADR-15): serif headlines, hairlines, no radius | ✅ |
| Real photography: 20 articles, 20 cities, 25 categories seeded from Openverse with credits | ✅ |
| Homepage hero (lead story + numbered headlines with thumbnails + city photo strip) | ✅ |
| Photo banners on city / category hubs; photo tiles on hubs | ✅ |
| Skeletons, error states | 🟡 skeletons ✅; error pages basic |
| Mega menu (full-width panels per section, mobile expanders) | ✅ |
| Upload fields (`src/components/upload`): drop, paste or browse; instant preview with real progress and cancel; browser-side downscale; replace, remove, retry; multi-image gallery with parallel uploads, cover, reorder by drag or arrows, captions; PDF field; CSV picker; touch-visible controls; container-aware hints | ✅ |
| Admin shell: grouped sidebar with queue counts, dashboard KPIs with weekly deltas and 14-day bars, needs-attention queue, consistent tabs/tables/rows, pagination, system status, editor autosave + Ctrl+S + crash recovery | ✅ |
| Free-tier architecture (docs/FREE-TIER.md, ADR-24): R2 images with renditions, no image optimiser, session hint cookie, email budget, daily-only crons with opportunistic jobs, pruning | ✅ |

## Next builds (in order)
1. ✅ Directory volume tooling (import, dedupe, areas, map)
2. More compare pages (cars, bank accounts, mobile packages) on the inverter-compare pattern.
3. Tools to 30: ✅ sales tax, 231B, EOBI, FX converter, personal loan, increment, age · next: stamp duty per province, savings/NSC, car import duty, gas bill, freelancer tax, provident fund
4. ✅ Typo tolerance + intent blending in search.
5. ✅ Professional profiles (ADR-26): hub, profession and city lists, profile page, editor with CV upload, owner dashboard, Verified plan, admin approval.
6. ✅ Community (ADR-27): member profiles, posts (jobs, listings, auctions, questions, discussions) with editor approval, bids, comments and replies, likes on posts, comments and articles, reports, moderation queue with bans and member verification.
7. Next: reviews for professionals; saved items; notifications (email digest of replies); community search facets by city.
8. Go-live checklist when told (`docs/LOCAL-TO-PRODUCTION.md` + `docs/FREE-TIER.md`), then AdSense, Resend, Search Console, Position Tracking.
