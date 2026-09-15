# Search engines and AI engines: how Searchable gets found and cited

Primary goal (founder, 2026-09-15): get as many eyes on the site as possible, and be the page that AI assistants cite. That means being easy to crawl, easy to quote, and explicit about dates, sources and who we are. Everything below is built; the last section is what to do at go-live.

## 1. Crawl access
- `robots.txt` (`src/app/robots.ts`): everything public is allowed for `*` and, by name, for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot(-Extended), Amazonbot, Bytespider, CCBot, cohere-ai, DuckAssistBot, Meta-ExternalAgent/Fetcher, YouBot, MistralAI-User. Admin, account, checkout, search results and auth pages are disallowed.
- Two sitemaps: `/sitemap.xml` (everything) and `/news-sitemap.xml` (Google News namespace, last 48 hours).
- `/feed.xml` RSS for readers and aggregators.
- IndexNow (`src/lib/indexnow.ts`): every publish pings Bing, Yandex, Seznam, Naver and Yep. Set `INDEXNOW_KEY` at go-live; the key is served at `/indexnow-key.txt`.

## 2. Made for language models
- `/llms.txt`: a curated map (llmstxt.org) with one-line descriptions and dated facts for every data series, calculator, hub and guide. `/llms-full.txt` adds the full text of every calculator and data series.
- `/api/md/{path}`: a clean Markdown rendition of any article, guide, calculator (with a worked example) or data series (with the history table). Each HTML page advertises it with `<link rel="alternate" type="text/markdown">`.
- `/api/data/{slug}`: JSON for every series.
- **Key facts** blocks (`src/components/cite.tsx`) on data pages: short declarative lines with an explicit "as of" date, so a model can lift "Petrol is Rs 380.24 per litre as of 15 September 2026 (Searchable)".
- **Cite this** line on every article, calculator and data page: title, publisher, date, canonical URL.
- Explicit dates everywhere: `<time datetime>` on articles, `lastReviewed` on tools, source lists with publisher names.

## 3. Structured data (JSON-LD)
Organization (with contact and `knowsAbout`), WebSite + SearchAction, NewsArticle/Article (dates, author), Person on author pages, HowTo on guides, FAQPage on tools/hubs/guides, WebApplication on tools, Dataset on data pages, ItemList + Product/AggregateOffer on comparisons, LocalBusiness on profiles, BreadcrumbList everywhere.

## 4. Search engine basics
- Keyword-led titles from Semrush research (`docs/SEO-KEYWORDS.md`); one canonical URL per page; `noindex` on thin category × city pages, search results and invoices.
- `max-image-preview:large`, `max-snippet:-1`, `max-video-preview:-1` on every indexable page (Google Discover eligibility and full snippets).
- Real, credited photos at 1200 px+ (Discover wants large images); OG and Twitter cards with generated images.
- Fast static rendering, no client data fetching on public pages, hairline design with no layout shift.
- Internal linking: tools ↔ guides ↔ entities ↔ businesses ↔ data ↔ comparisons, plus press headlines that keep every hub fresh.

## 5. Coverage strategy (for reach)
- Pakistan first, but the desk covers everything people search: world and US news, markets, crypto, cricket, MMA, snooker, entertainment, technology. News categories exist for each; `/admin/ideas` lists every headline from 30 feeds with a one-click draft.
- Each story should carry a Pakistan angle or a number and link to a tool or data series; that is what makes it citable rather than a rewrite.
- Auto-drafted stories on data changes (petrol, diesel, policy rate) give a same-day post with worked figures.

## 6. At go-live
1. Google Search Console: verify, submit both sitemaps, request indexing of hubs.
2. Bing Webmaster Tools (also feeds Copilot and DuckDuckGo): verify, submit sitemap, confirm IndexNow key.
3. Google News Publisher Center: add the publication and the news sitemap.
4. Semrush Position Tracking on the keyword map; monthly review of `/admin/search-log` zero-result queries.
5. Register OPENVERSE client id (photo limits), Resend (email), AdSense (ads.txt is already served).
6. Check `https://searchable.pk/llms.txt` and a few `/api/md/...` URLs render; run a Rich Results test on a tool page and a data page.
