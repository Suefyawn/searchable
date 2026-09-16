/** Static pages rendered by src/app/[page]/page.tsx. Markdown; edit freely. */
export const PAGES: Record<string, { title: string; description: string; body: string }> = {
  about: {
    title: "About Searchable",
    description: "Searchable is Pakistan's information platform: news with context, step-by-step guides, calculators, a business directory and structured data, all searchable in one place.",
    body: `Searchable exists to make useful information about Pakistan **easy to find, understand and use**.

Most of what people need is scattered: a tax rate in a Finance Act PDF, a process buried in a government portal, a business's phone number on a Facebook page, a price in a news story from three weeks ago. Searchable brings it together and keeps it current.

## What we publish

- **News**, with the useful context: what changed, what it means for you, what to do next.
- **Guides**, step-by-step processes with fees, timelines and the mistakes to avoid.
- **Tools**, calculators whose every number carries a source and a review date.
- **Businesses**, a directory with verified listings, hours, phone and WhatsApp.
- **Data**, the prices and rates Pakistanis check daily, with history.

## How we work

Every factual claim has a source. Money-affecting numbers show an effective date and a last-reviewed date. Corrections are appended, never hidden. Much of our routine reporting is researched, written and published by an AI editorial system working under written rules (sources with URLs on every claim, no press text reproduced, nothing published without a source); a person owns the desk, reviews what it does and corrects it. Read our [editorial policy](/editorial-policy).

## Contact

[hello@searchable.pk](mailto:hello@searchable.pk) or the [contact form](/contact).`,
  },
  privacy: {
    title: "Privacy policy",
    description: "What Searchable collects, why, and your choices.",
    body: `## What we collect
- **Search queries**, stored without identifying you, to improve results and decide what to build.
- **Calculator inputs**, stored in aggregate, anonymously, to understand usage. Calculations run in your browser.
- **Newsletter**, your email and topic preferences, with double opt-in. Unsubscribe with one click.
- **Account**, name, email and a password hash if you create an account.
- **Business enquiries**, the name, phone and message you send to a business are passed to that business only.

## What we do not do
We do not sell personal data. We do not show behavioural advertising based on your searches.

## Cookies and analytics
A session cookie if you sign in. Our own analytics are first-party and aggregated. We also use Microsoft Clarity to see how pages are used (heatmaps and anonymised session recordings); Clarity sets its own cookies and is covered by [Microsoft's privacy statement](https://privacy.microsoft.com/privacystatement). Text you type into forms is masked before it reaches Clarity.

## Contact
privacy@searchable.pk`,
  },
  terms: {
    title: "Terms of use",
    description: "Terms for using Searchable.pk.",
    body: `Searchable provides information for general guidance. Calculators are estimates; confirm figures with the primary source before acting. Business listings are provided by businesses and the public; we verify what we can and label what we have not. By using Searchable you agree not to scrape, misuse or misrepresent its content. Content is © Searchable unless stated.`,
  },
  "editorial-policy": {
    title: "Editorial policy",
    description: "How Searchable reports, sources, corrects and labels content, including sponsored content, guest posts and affiliate links.",
    body: `## Independence

Editorial content, news, guides, calculator methodology and data, is produced by Searchable's desk and is never for sale. Advertisers and listing customers do not see, approve or influence it.

## Sourcing

Every number carries a source and a review date. Guides cite the law, notification, tariff or official page they rely on. We link primary sources wherever they exist.

## How we use AI

Much of the day-to-day desk work is done by an AI editorial system: it reads the press, official notifications and our own data, writes stories and guides in our house style, records prices, moderates community posts and answers routine mail. It works under written rules: every claim carries a dated source with a link, press text is never reproduced, nothing is published without a source, photographs come only from openly licensed collections, and it must not invent quotes, people, prices or events. A person owns the desk, reviews its output, answers for it and corrects it; anything it gets wrong is treated exactly like any other error, with a correction note and date. If you spot a problem, the "Report a problem" link on the page reaches a human.

## Corrections

Errors are corrected in the article with a note and date. Report one from the "Report a problem" link on any page or email [editorial@searchable.pk](mailto:editorial@searchable.pk).

## Sponsored content

Sponsored articles and press releases are paid for by the company named in them. They are labelled **Sponsored** at the top, written or edited to our standards, and any links to the sponsor carry \`rel="sponsored"\`. They never appear in the news feed's lead position or in calculator results.

## Guest posts

Guest articles are unpaid contributions by practitioners, published with a byline and a short bio. They are edited and fact-checked like any other guide. Contributors may link once to their organisation (nofollow). We do not accept guest posts that exist to place links.

## Directory listings

Paid tiers (Verified, Premium, Sponsored) change **placement** in directory listings and are labelled. They do not change ratings, reviews or the facts on a profile. Reviews are moderated for spam and abuse only.

## Affiliate links

Where we use affiliate links (for example to a bank or an online store) we say so on the page. They never determine which product we recommend.

## Advertising

Display advertising is served by Google AdSense and labelled "Advertisement". Ads never appear inside calculators or above calculator results.`,
  },
};
