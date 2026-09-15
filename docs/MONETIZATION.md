# Monetization plan: how Searchable earns

Goal: profitable from organic traffic and business customers, without ever selling editorial content or calculator results. Three revenue lines, in the order they arrive.

## The order things happen

| Stage | Trigger | Revenue line | What is already built |
|---|---|---|---|
| **0. Now (local)** |: | Nothing yet. Build inventory: pages, tools, listings. | Everything in this doc except the card gateway |
| **1. Go-live → Day 90** | Site live on searchable.pk, 200+ indexed pages, AdSense approval | **AdSense** on articles, guides, data pages, DISCO pages | `AdSlot` component, ads.txt route, editorial-policy/privacy/about/contact pages (AdSense requires them) |
| **2. Day 60 onwards** | 500+ business listings, first claims | **Business plans**: Verified Rs 9,900/yr · Premium Rs 4,900/mo · Sponsored Rs 19,900/mo · Category sponsor Rs 14,900/mo | Pricing (`src/content/pricing.ts`), owner Upgrade page, invoices, `/admin/orders`, tier placement + dofollow entitlement, cron expiry |
| **3. Day 90 onwards** | Domain authority visible in Semrush (DA/AS > 15) | **Sponsored articles Rs 35,000 · Press releases Rs 12,000** (the "backlink" product, done properly) + free guest posts for content volume | `/write-for-us`, `/advertise`, submissions queue, convert-to-draft with Sponsored label and `rel=sponsored` |
| **4. Day 180+** | Newsletter > 3,000 subscribers | Newsletter sponsorship (1 sponsor/issue) | Issue builder; sponsor slot is a markdown block for now |
| **5. Day 300+** | Traffic on comparison pages | Affiliate: banks (car/home loans), insurance, solar, e-commerce (PTA-approved phones) | Tracked links + `rel=sponsored` pattern; disclosure line in editorial policy |

## 1. AdSense: what it takes and what it pays

**Approval checklist** (all present):
- Original content, 30+ substantial pages ✅ (20 seed articles + 14 tools + hubs; needs real daily publishing after go-live)
- About, Contact, Privacy, Terms, Editorial policy pages ✅
- No placeholder/thin pages indexed, category × city pages `noindex` below 5 listings ✅
- Fast, mobile-first, no intrusive interstitials ✅
- `ads.txt` served at `/ads.txt` (route added; fill in the publisher id) ✅

**Placement policy** (`src/components/ads.tsx`): leaderboard under the header on article/guide/data/DISCO pages, one in-article unit after the body, sidebar on article pages, footer on hubs. **Never** inside tool forms or above calculator results, never on search, admin, account, login or newsletter pages. This is both AdSense policy and the reason people trust the tools.

**Realistic numbers for Pakistan traffic:** RPM (revenue per 1,000 page views) Rs 150–600 depending on page type. Finance/tax/solar/property pages sit at the top of that range; general news at the bottom. At 300k page views/month (a Phase 3 exit target) that is Rs 45,000–180,000/month. AdSense is the floor, not the business.

**Turn it on:** set `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-…` and the slot ids `NEXT_PUBLIC_ADSENSE_SLOT_{LEADERBOARD,IN_ARTICLE,SIDEBAR,FOOTER}` in Vercel env; redeploy. Off by default so local and staging never load Google scripts.

## 2. Business plans: the main line

Directory listings are free forever (address, phone, hours, reviews, claim). What we sell is **placement and trust signals**:

| Plan | Price | What changes | Why a business pays |
|---|---|---|---|
| Verified | Rs 9,900 / year | Verified badge + last-checked date; ranks above free; **dofollow** website link (free is nofollow); owner replies to reviews; leads + click analytics | Cheapest credible backlink from a Pakistani site with real traffic; the badge converts |
| Premium | Rs 4,900 / month | Top of category × city; gallery; services; WhatsApp/call tracked; featured on city hub | Being first for "solar companies in Lahore" is worth far more than Rs 4,900 to an installer |
| Sponsored | Rs 19,900 / month | First nationally in the category, labelled Sponsored; mentioned in relevant guides where genuinely useful | Category leaders (banks, telcos, solar brands) |
| Category sponsor (city) | Rs 14,900 / month | Pinned first on one category × city page; one per page | Exclusive, scarce, simple to explain |

**How the money flows (built):** owner clicks *Upgrade* → picks plan → invoice `SP-2026-000123` created and emailed with bank / JazzCash / Easypaisa details → payer submits transaction ID on the invoice page → admin sees it in `/admin/orders`, clicks *Mark paid* → tier, expiry, verified badge set automatically; expiry cron downgrades when it lapses. A card gateway (Safepay or PayFast, both Pakistani, both support cards + wallets) plugs in as another `provider` on the same order.

**Sales motion for the first 100 paying businesses:** the click-tracking data is the pitch. Every claimed business sees "this month: 43 call clicks, 12 WhatsApp, 9 website" in its dashboard. Emailing owners of unclaimed listings with their numbers ("people are already calling you from Searchable, claim it, then get verified") is the cheapest funnel we have. `/admin/leads` + the monthly performance email (Sponsored tier) are the tools.

**Targets:** 50 paying businesses by Day 200 (≈ Rs 350k/month mixed), 300 by Day 500 (≈ Rs 2M/month). At that point plans out-earn AdSense 10:1.

## 3. Sponsored content and backlinks: done without poisoning the site

Everyone selling "guest posts" in Pakistan sells hidden dofollow links in filler articles. That gets sites penalised and readers leave. We sell the same outcome (a link on a trusted site) **openly**:

- **Sponsored article, Rs 35,000:** useful article about the product, edited to our standard, labelled *Sponsored*, up to 2 links with `rel="sponsored"` (Google's required attribute, still passes brand, traffic and legitimacy; still what serious buyers want). Shared once in the newsletter.
- **Press release, Rs 12,000:** published in Business within 2 working days, one link.
- **Guest article, free:** practitioners write real guides, get a byline and one nofollow link. This is a content-volume engine: 4–8 free guides a month from tax practitioners, installers and lawyers who want the visibility.

**Flow (built):** `/write-for-us` form → `submissions` row (+ invoice for paid kinds) → `/admin/submissions` → *Convert to draft* creates an article with the contributor byline and, for paid kinds, `isSponsored` (disclosure block, Sponsored badge, outbound links rewritten to `rel="sponsored"`). The editor finishes it in the normal article editor.

**Pricing rises with authority:** revisit `pricing.ts` every quarter against Semrush Authority Score. At AS 20+ sponsored posts in this market clear Rs 60–80k.

## 4. What is deliberately not for sale

- Calculator results, rate tables, data series, ever.
- Reviews or ratings. Moderation is for spam and abuse only.
- Position in news or guides listings. Sponsored articles live in their section, never in the lead slot.
- Hidden links of any kind.

This is in `/editorial-policy` so customers can be pointed at it when they ask.

## 5. Admin coverage

| Need | Where |
|---|---|
| See money: revenue to date, last 30 days, awaiting payment | `/admin/orders` header |
| Confirm a payment, cancel an invoice | `/admin/orders` |
| Review pitches, read the draft, set status, convert to article | `/admin/submissions` |
| Change prices, features, bank details | `src/content/pricing.ts` (one file; every page and invoice follows) |
| Turn ads on/off, slot ids | Vercel env vars |
| Who is paying for what, when it lapses | Business rows (`tier`, `tierExpiresAt`) + orders |
| Leads, claims, click analytics per business | `/admin/leads`, owner dashboard |
| Newsletter sponsor slot | Issue editor (markdown block) |

## 6. SEO status (the thing that makes all of the above work)

Built: keyword-led titles from Semrush research (`docs/SEO-KEYWORDS.md`), per-page `generateMetadata`, JSON-LD (Article/HowTo/FAQ/WebApplication/LocalBusiness/Dataset/ItemList/Breadcrumb/Organization), OG images, sitemap index, RSS, canonical URLs, redirects table, `noindex` on thin pages, internal linking (tools ↔ guides ↔ entities ↔ businesses ↔ data), real credited photos, fast static rendering.

Still to do after go-live: Search Console + Semrush Position Tracking, daily publishing cadence (3–5 news, 1 guide), directory volume (bulk import pipeline is the next build), backlink outreach using the free guest-post programme in reverse (we contribute to others), and monthly zero-result-search review from `/admin/search-log` to feed the content backlog.
