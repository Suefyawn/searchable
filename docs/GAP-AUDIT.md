# Gap audit: plan vs. built (updated 2026-09-17)

Legend: ✅ built · 🟡 partial · ❌ missing. "Plan" = the original 1000-day plan + `docs/ROADMAP-1000-DAYS.md`. Money: see `docs/MONETIZATION.md`.

## Foundation
| Item | Status | Note |
|---|---|---|
| Repo, Next.js 16, TS strict, Tailwind v4, Drizzle, PGlite locally | ✅ | |
| UI primitives | ✅ | Hand-rolled, ADR-12/15 (minimal newspaper) |
| Supabase / Vercel / staging / production | ✅ | Live at https://searchable.pk since 2026-09-15: Vercel Hobby + Supabase + R2 + Resend (`docs/LOCAL-TO-PRODUCTION.md`) |
| CI | ✅ | GitHub Actions: typecheck, lint, build |
| Env management | ✅ | `.env.example`; ads/Openverse/billing keys documented |
| Error monitoring | ✅ | No vendor: `src/instrumentation.ts` records every uncaught server error as an `error` event, the error page reports browser crashes through the beacon, `/admin/system` groups the last 24 hours (docs/FREE-TIER.md) |
| Hardening (audit of 2026-09-17, ADR-39) | ✅ | Member markdown escaped, script links refused, search snippets escaped, invoice links signed, security headers on every response, cron secret required in production, URL fields validated. Still in memory: the rate limiter (per instance) |

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
| jobs | ✅ | Community posts with `kind=job` (JobPosting JSON-LD), plus the admin API for the task |
| events, deals | ❌ | Phase 7 |

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
| Tools built | 🟡 39 of 50; 2026-09-18 added passport fee (DGIP charts), vehicle transfer fee (Punjab Excise), CGPA (new education category), gold converter, solar panel count, electricity units, battery backup, fuel average, all picked by Semrush pk volume and KD |
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
| Resend delivery + open/click tracking | ✅ live since go-live (2026-09-15); receiving feeds the admin inbox (ADR-28) |
| Sponsor slot | 🟡 markdown block; no product/booking yet |

## Data · Compare · Trust
| Item | Status |
|---|---|
| 14 data series, history, charts, stats, API, admin entry, city sections (gold), inflation | ✅ |
| Automated ingestion (SBP, er-api, PSO, spot gold/silver → 12 of 14 series; daily cron + Fetch now; 30% jump guard) | ✅ |
| Data → auto-drafted article on change (petrol, diesel, policy rate → draft news with worked numbers) | ✅ |
| Compare pages | ✅ 4: new cars and solar inverters (versioned files); air conditioners and credit cards as living comparisons the task refreshes twice a month (`POST /api/admin/compare`), noindex until they hold five items |
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
| Search Console / Position Tracking | 🟡 | verification meta tags via `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION`; founder to verify and submit sitemaps |

## Design
| Item | Status |
|---|---|
| Minimal newspaper system (ADR-15): serif headlines, hairlines, no radius | ✅ | Charcoal and blue kit (ADR-32), tunable from `/admin/settings`; brand page at `/brand` |
| Site settings without a deployment: brand kit with live preview, identity and socials, hero slides and carousel speed, ticker order, homepage switches; front-page desk with lead, pins and breaking bar (`/admin/front-page`, `POST /api/admin/front`) | ✅ |
| Real photography: 20 articles, 20 cities, 25 categories seeded from Openverse with credits | ✅ |
| Homepage hero (lead story + numbered headlines with thumbnails + city photo strip) | ✅ |
| Photo banners on city / category hubs; photo tiles on hubs | ✅ |
| Skeletons, error states | 🟡 public routes deliberately have no loading skeletons (streaming turned every notFound into a soft 404); error pages basic |
| Mega menu (full-width panels per section, mobile expanders) | ✅ |
| Upload fields (`src/components/upload`): drop, paste or browse; instant preview with real progress and cancel; browser-side downscale; replace, remove, retry; multi-image gallery with parallel uploads, cover, reorder by drag or arrows, captions; PDF field; CSV picker; touch-visible controls; container-aware hints | ✅ |
| Users (`/admin/users`, admin only): list with search and role filter, inline role change, create with password, edit, set password, sign out everywhere, community ban, footprint of what they own, delete with the last-admin and own-account guards | ✅ |
| Admin shell: grouped sidebar with queue counts, dashboard KPIs with weekly deltas and 14-day bars, needs-attention queue, consistent tabs/tables/rows, pagination, system status, editor autosave + Ctrl+S + crash recovery | ✅ |
| Free-tier architecture (docs/FREE-TIER.md, ADR-24): R2 images with renditions, no image optimiser, session hint cookie, email budget, daily-only crons with opportunistic jobs, pruning | ✅ |

## Next builds (in order)
1. ✅ Directory volume tooling (import, dedupe, areas, map)
2. More compare pages (cars, bank accounts, mobile packages) on the inverter-compare pattern.
3. ✅ Tools at 30: sales tax, 231B, EOBI, FX converter, personal loan, increment, age, NSC, gas bill, provident fund, freelancer tax (154A), cash withdrawal tax (231AB), mobile load tax, gratuity, overtime, rental yield · parked until rates can be verified against official notifications: stamp duty per province, car import duty
4. ✅ Typo tolerance + intent blending in search.
5. ✅ Professional profiles (ADR-26): hub, profession and city lists, profile page, editor with CV upload, owner dashboard, Verified plan, admin approval.
6. ✅ Community (ADR-27): member profiles, posts (jobs, listings, auctions, questions, discussions) with editor approval, bids, comments and replies, likes on posts, comments and articles, reports, moderation queue with bans and member verification.
7. ✅ Notifications (`src/lib/notify.ts`): enquiry emails to business owners (unclaimed listings get the claim link), professionals; outbid emails; one daily digest of comments, replies, likes and bids. ✅ Professional reviews with owner replies and admin moderation. ✅ Home page strips for community and professionals.
8. ✅ Saved items (bookmark on articles, calculators, data series, businesses, professionals and posts; `/account/saved`) and the daily digest preference.
9. ✅ Go-live (2026-09-15). ✅ Admin inbox on Resend receiving (ADR-28). ✅ Admin API + scheduled editorial task (ADR-29, `docs/ADMIN-API.md`, `docs/DAILY-TASK.md`).
10. ✅ Directory city lists and profession lists paginate in the path (`/page/2`, like news and guides) and are served from the CDN. Community lists keep `?city=&topic=&sort=&page=` (filters) and render per request, cached 5 minutes.
11. ✅ Notification preferences per kind (`/account/notifications`: enquiries, outbid, daily digest; `users.notification_prefs`, migration 0012). Next: compare pages for bank accounts and mobile packages (need a monthly data source, not a one-off scrape); stamp duty calculator once provincial notifications are pinned down; AdSense after traffic; Search Console verification and sitemap submission by the founder.
