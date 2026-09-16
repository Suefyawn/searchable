# URL Architecture

Locked from Day 1. Changing a public URL later requires a row in `redirects`.

## Rules
- Lowercase, ASCII, hyphen-separated slugs. Urdu titles get a transliterated slug.
- No dates in URLs. No trailing slashes. No query params for canonical content.
- Category precedes slug for content; `/b/[slug]` is the short canonical for a business (so a business can change category without changing URL).
- Location pages only exist (and are only indexable) when they hold real content: ≥ 5 listings for a category × city, ≥ 1 for a city hub.
- Every page has exactly one canonical URL.

## Tree

```
/                                        Home = search + latest + tools + cities
/search?q=                               Federated search (dynamic, noindex)
/suggest?q=                              (API) autocomplete

/news                                    News hub
/news/[category]                         pakistan · politics · business · economy · technology · ai · science
                                         sports · education · health · auto · property · lifestyle · world
/news/[category]/[slug]                  Article

/guides                                  Guides hub
/guides/[category]                       taxes · banking · cars · property · government · utilities
                                         telecom · education · health · travel · business
/guides/[category]/[slug]                Guide (HowTo JSON-LD)

/tools                                   Tools hub
/tools/[category]                        tax · finance · cars · property · utilities · government · solar · telecom
/tools/[category]/[slug]                 Tool page (WebApplication JSON-LD)
/tools/[category]/[slug]?…               Shareable pre-filled state (canonical = bare URL)

/businesses                              Directory hub, categories + cities
/businesses/[category]                   Category hub (national)
/businesses/[category]/[city]            Category × city listing  ← primary SEO page type
/businesses/[category]/[city]/page/[n]   Page n of that listing (n ≥ 2, 404 past the end)
/businesses/[category]/[city]/[area]     Category × area (Phase 4, gated)
/b/[slug]                                Business profile (LocalBusiness JSON-LD)
/claim/[slug]                            Ownership claim (signed in; ?t= invite token)   noindex
/claim/opt-out?t=                        One-click stop for claim invitations

/professionals                           Professionals hub (groups, cities)
/professionals/[profession]              Profession list, national (all = every profession)
/professionals/[profession]/page/[n]     Page n of that list
/professionals/[profession]/[city]       Profession × city (noindex under 3 profiles)
/professionals/join                      Create a profile (signed in)
/p/[slug]                                Professional profile (Person JSON-LD)
/professional  /professional/[id]        Owner dashboard, editor, /upgrade for the Verified plan

/community  → /community/all             Posts hub
/community/[kind]                        job · listing · auction · question · discussion · all
/community/post/[slug]                   Post (JobPosting / Product / DiscussionForumPosting JSON-LD); /edit
/community/new                           Create a post (signed in; editor-approved)
/u/[handle]                              Member profile (noindex until they have posted)

/cities                                  All cities
/cities/[city]                           City hub: top categories, latest local news, areas
/cities/[city]/[area]                    Area hub (Phase 4)

/e/[entity]                              Entity hub (FBR, NADRA, Toyota, USD, Lahore…)

/data                                    Data hub (Phase 6)
/data/[series]                           e.g. /data/petrol-price · /data/usd-pkr · /data/gold-rate

/today                                   Daily hub: prices, weather, prayer times, Islamic date
/weather  /weather/[city]                MET Norway forecast per city (cities with coordinates), ISR 30 min
/prayer-times  /prayer-times/[city]      Computed namaz times, sehri and iftar, week ahead
/islamic-date                            Hijri date for Pakistan (Umm al-Qura + Ruet-e-Hilal offset)

/compare                                 (Phase 6)
/compare/[slug]                          e.g. /compare/toyota-corolla-vs-honda-civic

/events /events/[city] /events/[slug]    (later)
/deals  /deals/[city]  /deals/[slug]     (later)

/newsletter                              Subscribe + preferences
/newsletter/confirm?token=               Double opt-in
/newsletter/unsubscribe?token=

/about  /contact  /editorial-policy  /privacy  /terms  /advertise  /add-business

/account                                 User home; /account/profile, /account/posts, /account/saved,
                                         /account/notifications
/business                                Owner dashboard (claimed businesses); /business/[id], /upgrade
/admin                                   CMS + operations (role ≥ editor); /admin/claims, /outreach,
                                         /professionals, /community, /inbox, /backlog, /automation, /system

/api/auth/[...all]                       better-auth
/api/data/[slug]                         JSON (default) or ?format=csv for every reading
/api/search  /api/suggest                JSON search; /suggest-index.json (cached client index)
/api/community/liked  /api/community/saved   Signed-in reader state (private, no-store)
/api/md/[...path]  /llms.txt  /llms-full.txt  Markdown and LLM renditions
/api/newsletter/subscribe                POST
/api/tools/[slug]                        POST run (for Ask Searchable + embeds)
/api/cron/*                              scheduled jobs (Phase 6)
/api/webhooks/resend                     POST, signed; email.received feeds the admin inbox
/api/admin/*                             Bearer ADMIN_API_KEY; context, reference, ideas, articles, data,
                                         businesses, backlog, queue, inbox, newsletter, media, jobs, report,
                                         compare, front, today (docs/ADMIN-API.md)

/sitemap.xml                             index → /sitemap/[type].xml
/robots.txt
/feed.xml                                RSS (news)
```

## Slug policy
- Articles: from title, max 80 chars, unique per kind; collisions get `-2`, `-3`.
- Businesses: `name-city` (e.g. `bundu-khan-lahore`); uniqueness enforced.
- Tools: hand-chosen, stable (`income-tax-calculator`).
- Locations: ISO-ish (`lahore`, `dha-phase-5`, `punjab`).
- Entities: hand-chosen (`fbr`, `nadra`, `toyota`, `usd-pkr`).
