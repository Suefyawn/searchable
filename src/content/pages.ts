/** Static pages rendered by src/app/[page]/page.tsx. Markdown; edit freely. */
export const PAGES: Record<string, { title: string; description: string; body: string }> = {
  about: {
    title: "About Searchable",
    description: "Searchable is Pakistan's information platform: news with context, step-by-step guides, calculators, a business directory and structured data — all searchable in one place.",
    body: `Searchable exists to make useful information about Pakistan **easy to find, understand and use**.

Most of what people need is scattered: a tax rate in a Finance Act PDF, a process buried in a government portal, a business's phone number on a Facebook page, a price in a news story from three weeks ago. Searchable brings it together and keeps it current.

## What we publish

- **News** — with the useful context: what changed, what it means for you, what to do next.
- **Guides** — step-by-step processes with fees, timelines and the mistakes to avoid.
- **Tools** — calculators whose every number carries a source and a review date.
- **Businesses** — a directory with verified listings, hours, phone and WhatsApp.
- **Data** — the prices and rates Pakistanis check daily, with history.

## How we work

Every factual claim has a source. Money-affecting numbers show an effective date and a last-reviewed date. Corrections are appended, never hidden. AI helps us research and draft; a person publishes. Read our [editorial policy](/editorial-policy).

## Contact

[hello@searchable.pk](mailto:hello@searchable.pk) or the [contact form](/contact).`,
  },
  "editorial-policy": {
    title: "Editorial policy",
    description: "How Searchable researches, publishes, corrects and labels content.",
    body: `## Sources
Every factual claim has a source, listed on the page. Primary sources (laws, regulator notifications, official portals) take precedence over secondary reporting.

## Numbers
Any figure that affects money — tax rates, tariffs, fees, prices — shows the date it took effect and the date we last reviewed it. Calculators carry a version number; changes are logged.

## Corrections
Corrections are appended to the article with a date. We do not silently rewrite published claims. Report an error via the [contact form](/contact).

## AI
We use AI internally for research, monitoring, drafting outlines and suggesting links. **No AI-generated page is published without human review.** Public AI features, when they arrive, will cite Searchable's own sources and decline to answer outside them.

## Directory
Business listings display a verification badge and last-verified date when we have confirmed details with the business. Unverified listings are labelled. Reviews are never paid for. Businesses can respond to reviews but cannot remove them.

## Sponsorship and advertising
Sponsored listings and content are labelled. Advertisers have no influence on editorial content, rankings or calculator results.`,
  },
  privacy: {
    title: "Privacy policy",
    description: "What Searchable collects, why, and your choices.",
    body: `## What we collect
- **Search queries** — stored without identifying you, to improve results and decide what to build.
- **Calculator inputs** — stored in aggregate, anonymously, to understand usage. Calculations run in your browser.
- **Newsletter** — your email and topic preferences, with double opt-in. Unsubscribe with one click.
- **Account** — name, email and a password hash if you create an account.
- **Business enquiries** — the name, phone and message you send to a business are passed to that business only.

## What we do not do
We do not sell personal data. We do not show behavioural advertising based on your searches.

## Cookies
A session cookie if you sign in. Analytics are first-party and aggregated.

## Contact
privacy@searchable.pk`,
  },
  terms: {
    title: "Terms of use",
    description: "Terms for using Searchable.pk.",
    body: `Searchable provides information for general guidance. Calculators are estimates; confirm figures with the primary source before acting. Business listings are provided by businesses and the public; we verify what we can and label what we have not. By using Searchable you agree not to scrape, misuse or misrepresent its content. Content is © Searchable unless stated.`,
  },
  advertise: {
    title: "Advertise on Searchable",
    description: "Reach Pakistanis at the moment they are looking for what you offer.",
    body: `Searchable reaches people with **intent** — they are calculating a tax, comparing a loan, looking for a solar installer, reading a guide before buying a car.

## Options (from Phase 6)
- **Verified & Premium listings** — enhanced profile, featured placement in your category and city, enquiry analytics.
- **Category sponsorship** — your brand across a category's pages.
- **Newsletter sponsorship** — Searchable Daily, one sponsor per issue.
- **Leads** — pay per qualified enquiry.

All sponsored placements are labelled. Editorial content and calculator results are never for sale.

Email [ads@searchable.pk](mailto:ads@searchable.pk).`,
  },
};
