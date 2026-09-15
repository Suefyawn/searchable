# Content Operations

Two tracks run every day. Track A builds the product; Track B fills it. Neither waits for the other.

## Daily system (founder, solo)

| Block | Track | Work |
|---|---|---|
| Morning (90 min) | B: Research | Scan: Dawn/Tribune/Business Recorder/ProPakistani, FBR/SBP/PTA/OGRA/NEPRA notices, Google Trends PK, X/Reddit PK. Capture 5–10 candidate stories in `/admin/research`. |
| Morning (2 h) | B: Publish | 3–5 news pieces (300–600 words, each linking to ≥ 1 tool/guide/entity) + 1 evergreen guide (or a refresh of an existing one). |
| Midday (45 min) | B: Data/Tools | Update any changed rate (petrol, FX, gold, tariff). Ship or update 1 tool every 2 days. |
| Afternoon (60 min) | B: Directory | Add 10 businesses, verify 5 by phone/WhatsApp, process claims/submissions, moderate reviews. |
| Late afternoon (3 h) | A: Product | Feature work per roadmap; bugs; performance; SEO fixes from GSC. |
| Evening (30 min) | B: Distribution | Social posts (X, Facebook, LinkedIn, WhatsApp channel) from today's content. |
| Night (30 min) | B: Newsletter | Assemble tomorrow's Searchable Daily (auto-draft from the day's content; human edit). |

## Weekly cadence

| Day | Focus |
|---|---|
| Mon | Content plan for the week (news beats, guide topics, tool queue) |
| Tue | Tools + data day (ship, verify rates, methodology reviews) |
| Wed | Directory day (imports, verification sprints, category × city gaps) |
| Thu | Evergreen SEO (refresh top-20 pages, internal links, zero-result search queries → new content) |
| Fri | Newsletter review + weekly issue |
| Sat | Product sprint (bigger features) |
| Sun | Analytics + planning; update roadmap; rest |

## Monthly review (KPI dashboard in `/admin/analytics`)

Traffic (organic / direct / referral / social) · GSC impressions, clicks, CTR, ranking keywords · indexed pages · content counts · directory counts (total / verified / claimed) · newsletter (subs, open, click) · product (searches, zero-result rate, tool runs, business clicks, leads).

## Editorial policy (public page `/editorial-policy`)

1. Every factual claim has a source; sources are listed on the page.
2. Numbers that affect money (tax, tariffs, rates) show *effective date* and *last reviewed*.
3. Corrections are appended, dated, and never silently overwritten.
4. AI may draft; a human publishes. No AI-generated page goes live unreviewed.
5. Business listings show *last verified* date; unverified listings are labelled.
6. Sponsored content is labelled. Reviews are never paid for.

## Article template (news)

```
Title (≤ 70 chars, specific, no clickbait)
Dek (1 sentence: what changed and why it matters)
What happened (2–3 short paragraphs)
What it means for you (bullets, the useful part)
Numbers (if any), link to data series / tool
What to do next, link to guide / tool / businesses
Sources
Related: 1 tool · 1 guide · 1 entity · 1 category × city page
```

## Guide template

```
Title: How to … in Pakistan (2026)
Summary box: time, cost, documents, where
Steps (numbered, each with a concrete action)
Fees & timelines table
Common problems
FAQs (5–8, also emitted as FAQPage JSON-LD)
Related tools / news / businesses
Last reviewed: date · Sources
```

## The data pipeline rule

Every important number is captured once and reused seven times:

```
Source (OGRA notification)
  → data_points row (petrol, 2026-09-16, 268.50)
  → /data/petrol-price page + chart
  → fuel cost calculator picks it up automatically
  → auto-drafted news article ("Petrol price changes by Rs X")
  → Searchable Daily "useful number"
  → social post
  → entity hub /e/ogra updated
```

## Content backlog sources
- Zero-result search queries (`/admin/search-log`)
- GSC queries with impressions but no ranking page
- Tool pages without a companion guide
- Category × city pages with < 5 listings (directory backlog)
- Government notifications (FBR SROs, SBP circulars, OGRA/NEPRA decisions, PTA notices)

## Launch content set (write during Phase 1, publish on Day 41)

Guides (15): become a tax filer · file income tax return · NTN registration · vehicle registration (Punjab) · vehicle transfer · passport application · CNIC renewal · NADRA FRC · PTA phone registration · open a bank account · Roshan Digital Account · register a company (SECP) · electricity new connection · net metering (solar) · property transfer & taxes.

News beats (30): federal budget follow-ups, petrol/diesel price changes, SBP policy rate, USD/PKR moves, gold, electricity tariff, PTA tax updates, car price changes, property tax, telecom packages, tech launches in Pakistan, education (HEC/board results), sports headlines with a Pakistan angle.
