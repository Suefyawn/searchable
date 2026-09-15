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

/businesses                              Directory hub — categories + cities
/businesses/[category]                   Category hub (national)
/businesses/[category]/[city]            Category × city listing  ← primary SEO page type
/businesses/[category]/[city]/[area]     Category × area (Phase 4, gated)
/b/[slug]                                Business profile (LocalBusiness JSON-LD)

/cities                                  All cities
/cities/[city]                           City hub: top categories, latest local news, areas
/cities/[city]/[area]                    Area hub (Phase 4)

/e/[entity]                              Entity hub (FBR, NADRA, Toyota, USD, Lahore…)

/data                                    Data hub (Phase 6)
/data/[series]                           e.g. /data/petrol-price · /data/usd-pkr · /data/gold-rate

/compare                                 (Phase 6)
/compare/[slug]                          e.g. /compare/toyota-corolla-vs-honda-civic

/jobs  /jobs/[city]  /jobs/[slug]        (Phase 7)
/events /events/[city] /events/[slug]    (Phase 7)
/deals  /deals/[city]  /deals/[slug]     (Phase 7)

/newsletter                              Subscribe + preferences
/newsletter/confirm?token=               Double opt-in
/newsletter/unsubscribe?token=

/about  /contact  /editorial-policy  /privacy  /terms  /advertise  /add-business

/account                                 User: saved, follows, preferences
/business                                Owner dashboard (claimed businesses)
/admin                                   CMS + operations (role ≥ editor)

/api/auth/[...all]                       better-auth
/api/search  /api/suggest                JSON search
/api/newsletter/subscribe                POST
/api/tools/[slug]                        POST run (for Ask Searchable + embeds)
/api/cron/*                              scheduled jobs (Phase 6)

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
