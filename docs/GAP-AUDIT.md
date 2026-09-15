# Gap audit — plan vs. built (2026-09-15)

Legend: ✅ built · 🟡 partial · ❌ missing. "Plan" = the original 1000-day plan + `docs/ROADMAP-1000-DAYS.md`.

## Foundation (Days 1–7)
| Item | Status | Note |
|---|---|---|
| Repo, Next.js, TS, Tailwind | ✅ | |
| shadcn/ui | 🟡 | Hand-rolled primitives, shadcn-compatible (ADR-12) |
| Supabase / Vercel / staging / production | ❌ | Deliberately deferred — founder will say when |
| CI/CD | ❌ | Add GitHub Actions: typecheck, lint, build, migration check |
| Env management | ✅ | `.env.example`, docs |

## Database entities (plan list)
| Entity | Status | Note |
|---|---|---|
| users, sessions | ✅ | |
| profiles, organizations | ❌ | Not needed until business teams / multi-editor |
| authors, editors | 🟡 | `authors` table exists; no author pages, no author picker in editor |
| articles, categories | ✅ | |
| tags | 🟡 | Table exists; no UI, not rendered |
| topics | ✅ | As `entities` (knowledge graph) |
| businesses + sub-tables | ✅ | categories, hours, services, photos, reviews, claims, leads |
| locations (province/city/area) | ✅ | Area pages not yet routed |
| tools, tool_usage | ✅ | `tool_versions` folded into `version` field |
| guides, guide_sections | ✅ | `articles.kind = guide`; sections = Markdown headings + TOC |
| events, jobs, deals | ❌ | Phase 7 |
| media | ✅ | Uploads |
| newsletters, subscribers, campaigns | 🟡 | Subscribers ✅; issues table ✅; no builder/sender |
| search_queries / logs | ✅ | |
| seo_metadata | ✅ | Fields on `articles`; `redirects` table exists but not applied |
| analytics_events | 🟡 | Table + a few events; no page-view/click tracking |

## Design system (plan list)
| Item | Status |
|---|---|
| Typography, colours, buttons, forms, badges, alerts, nav, mobile nav, search UI | ✅ |
| Cards: business, article, tool | ✅ |
| Author cards, location cards | ❌ |
| Tables component | 🟡 (ad hoc) |
| Modals | ❌ |
| Empty states | ✅ |
| Loading states / skeletons | ❌ |
| Error states | 🟡 (global error + 404 only) |

## Core platform (Days 15–30)
| Item | Status | Note |
|---|---|---|
| Homepage = search | ✅ | |
| Global search, categories, locations | ✅ | |
| Auth, accounts, admin auth, admin dashboard | ✅ | |
| CMS | ✅ | See editor gaps below |
| Media management | 🟡 | Uploads ✅; no library page |
| SEO management | 🟡 | Per-article fields ✅; redirects not enforced; no admin UI |
| Sitemap, robots, canonicals, OG, JSON-LD, breadcrumbs | ✅ | `og-default.png` referenced but missing → dynamic OG images needed |
| 404 / 500 | ✅ | |
| Error monitoring | ❌ | Sentry at go-live |

## Content engine (Days 31–45)
| Editor field / feature | Status |
|---|---|
| title, slug, excerpt/dek, body, featured image, category, sources, FAQs, SEO title/description, noindex, featured flag | ✅ |
| author selection | ❌ |
| tags | ❌ |
| topics (entities) | ✅ |
| publication date / scheduling | ❌ (`scheduled_for` column exists) |
| canonical override | ❌ (column exists) |
| social image | 🟡 (uses featured image) |
| related articles (manual) | ❌ (automatic by category) |
| workflow: draft → research → editing → fact-check → scheduled → published → updated | 🟡 enum exists; UI only draft/published |
| revisions | ✅ |
| preview of drafts | ❌ |
| autosave | ❌ |

## News / Guides (Days 46–75)
| Item | Status |
|---|---|
| Categories per plan | ✅ |
| Guides link to tools/businesses/news/related | 🟡 auto via entities and links in body |
| RSS | ✅ |

## Tools (Days 76–150)
| Item | Status |
|---|---|
| Framework: inputs, validation, engine, results, explanation, methodology, sources, version, SEO | ✅ |
| First 50 tools | 🟡 11 of 50 |
| Calculator defaults from live data (petrol, USD, gold) | ❌ — the "one number, seven products" link |
| Embeddable widgets | ❌ |

## Directory (Days 151–250)
| Item | Status |
|---|---|
| Public listing pages, profile, claim, add, edit, photos, services, respond to reviews, leads, dashboard | ✅ |
| Owner analytics | 🟡 views only; **no click tracking** (call/WhatsApp/website) |
| Area pages | ❌ |
| Duplicate detection | ❌ |
| Report business / review | ❌ |
| Verification workflow (phone/document) | 🟡 manual toggle |
| Bulk import | ❌ |
| Maps | ❌ (directions link only) |

## Search (Days 251–300)
| Item | Status |
|---|---|
| Federated, ranked, prefix, autocomplete, popular | ✅ |
| Synonyms | ❌ table seeded, not used |
| Typo tolerance | ❌ |
| Intent / entity / location detection | ❌ |
| City filter UI | ❌ (param exists) |
| Trending | ❌ |

## Newsletter (Days 301–350)
| Item | Status |
|---|---|
| Capture, topics, frequency, double opt-in, unsubscribe | ✅ |
| Manage preferences page (existing subscriber) | ❌ |
| Issue builder (auto-assembled daily) | ❌ |
| Sending + tracking | ❌ (Resend at go-live) |

## Data (Days 351–400) · Compare (401–450) · Local search (451–500) · Trust (501–550)
| Item | Status |
|---|---|
| Data series, history, chart, API, admin entry | ✅ |
| Automated ingestion | ❌ |
| Data → auto-drafted article | ❌ |
| Comparisons | ❌ |
| "Near me" / map search | ❌ |
| Reviews + moderation + owner response | ✅ |
| Report / duplicate / closed flows | 🟡 closed only |

## Later phases
Jobs · Events · Deals · billing tiers · Ask Searchable (AI) · follows/saved · PWA · scale — ❌ as planned (Phases 7–9). PWA manifest is cheap and should come earlier.

## Operations (daily system)
| Item | Status |
|---|---|
| Research capture (`/admin/research`) | ❌ |
| KPI dashboard | 🟡 counts only; no trends |
| Social posting | ❌ |
| Content backlog from zero-result searches | ✅ |

---

# Polish & detail backlog (ordered)

**A. Correctness / must-have before anyone sees it**
1. Dynamic Open Graph images (`/og/…`) — `og-default.png` is referenced and missing
2. Apply the `redirects` table (proxy/middleware) + admin UI
3. Loading skeletons for every section route; per-section error boundaries
4. Business click tracking (call / WhatsApp / website / directions) → `analytics_events` + `click_count`; owner analytics
5. Calculator defaults from the data hub (petrol, diesel, USD/PKR, gold) — server-supplied overrides
6. Editor: author picker, tags, scheduled publish (+ cron endpoint), canonical, manual related articles, draft preview, workflow states
7. Author pages `/authors/[slug]`; tag pages `/tags/[slug]`
8. Newsletter preferences page (token link in emails)
9. Report business / report review flows → admin queue
10. Media library `/admin/media` (reuse, alt text, credit)
11. Search: synonyms expansion, city filter UI, trending searches on home
12. PWA manifest + icons; skip-to-content link; print stylesheet for guides
13. Contact messages → table + admin inbox (not just email)
14. Business editor: entity tagging; duplicate warning on add-business (same phone / similar name in city)
15. CI: GitHub Actions (typecheck, lint, build)

**B. Design detailing**
16. Consistent spacing rhythm and type scale audit page by page (hubs, tool page, business page, admin)
17. Table styles (data history, admin lists) — hairline rows, right-aligned numbers, sticky header
18. Article page: pull-quotes, figure/caption style, "Key numbers" box, share bar, updated/corrections block
19. Business page: hours table with today highlighted, map placeholder, breadcrumb polish
20. Admin: denser tables, keyboard-friendly forms, unsaved-changes guard
21. Dark mode contrast pass

**C. Content and data**
22. Verify every rate table against primary sources; 39 more tools to reach 50
23. Real daily content replaces sample seed
24. Area pages for Lahore/Karachi/Islamabad once ≥ 5 listings each
