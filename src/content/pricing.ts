/**
 * Everything Searchable sells, in one place. Prices in PKR; edit here and every page, invoice and admin
 * screen follows. Kept deliberately simple for launch: three business tiers, two content products, one placement.
 */

export type Product = {
  code: string;
  kind: "business_plan" | "sponsored_post" | "placement" | "professional_plan";
  name: string;
  pricePkr: number;
  /** Billing period in days; null = one-off. */
  periodDays: number | null;
  /** Business tier granted while active (business plans only). */
  tier?: "verified" | "premium" | "sponsored";
  blurb: string;
  features: string[];
  popular?: boolean;
};

export const PRODUCTS: Product[] = [
  {
    code: "verified-annual",
    kind: "business_plan",
    name: "Verified",
    pricePkr: 9_900,
    periodDays: 365,
    tier: "verified",
    blurb: "The badge customers look for, and a link to your website.",
    features: ["Verified badge and last-checked date on your profile", "Ranked above free listings in your category and city", "Dofollow link to your website (free listings are nofollow)", "Respond to reviews as the owner", "Leads and click analytics in your dashboard"],
  },
  {
    code: "premium-monthly",
    kind: "business_plan",
    name: "Premium",
    pricePkr: 4_900,
    periodDays: 30,
    tier: "premium",
    blurb: "Top of your category in your city, with photos and a longer profile.",
    features: ["Everything in Verified", "Top placement in your category × city listing", "Photo gallery (up to 12) and services list", "WhatsApp and call buttons tracked", "Featured in the city hub's top-rated section"],
    popular: true,
  },
  {
    code: "sponsored-monthly",
    kind: "business_plan",
    name: "Sponsored",
    pricePkr: 19_900,
    periodDays: 30,
    tier: "sponsored",
    blurb: "The first result in your category across every city, labelled Sponsored.",
    features: ["Everything in Premium", "First result nationally in your category", "Mentioned in relevant guides and calculators where useful to readers", "Monthly performance report by email"],
  },
  {
    code: "sponsored-post",
    kind: "sponsored_post",
    name: "Sponsored article",
    pricePkr: 35_000,
    periodDays: null,
    blurb: "A useful article about your product or service, written to our standard, clearly labelled, with dofollow links.",
    features: ["800–1,500 words, edited by our desk", "Up to 2 dofollow links to your site (rel=sponsored per Google policy)", "Stays live permanently, in the relevant section", "Shared in Searchable Daily once", "Labelled Sponsored, readers trust it because we say so"],
  },
  {
    code: "press-release",
    kind: "sponsored_post",
    name: "Press release",
    pricePkr: 12_000,
    periodDays: null,
    blurb: "Your announcement published in Business news, lightly edited, with one link.",
    features: ["Published within 2 working days", "One link to your site", "Labelled as a press release"],
  },
  {
    code: "pro-verified-annual",
    kind: "professional_plan",
    name: "Verified professional",
    pricePkr: 4_900,
    periodDays: 365,
    tier: "verified",
    blurb: "For doctors, engineers, architects, lawyers, tutors and tradespeople: the checked badge on your profile.",
    features: ["Verified badge after we check your registration number and identity", "Ranked above free profiles in your profession and city", "Dofollow link to your website or portfolio", "CV and contact details shown with a verified mark", "Enquiry analytics in your dashboard"],
  },
  {
    code: "category-city-sponsor",
    kind: "placement",
    name: "Category sponsor (one city)",
    pricePkr: 14_900,
    periodDays: 30,
    blurb: "Own a category page in your city: your listing pinned first, above Premium.",
    features: ["Pinned first on /businesses/[category]/[city]", "One sponsor per category per city", "Shown on the city hub"],
  },
];

export function getProduct(code: string) {
  return PRODUCTS.find((p) => p.code === code);
}

/**
 * Bank and wallet details shown on invoices while payments are manual. They come from the environment so
 * nothing invented ever reaches a customer: when PAYMENT_ACCOUNT_NUMBER is unset the invoice says the details
 * will be emailed by billing, and the founder sends them by hand.
 */
export const PAYMENT_INSTRUCTIONS = {
  bankName: process.env.PAYMENT_BANK_NAME?.trim() || "",
  accountTitle: process.env.PAYMENT_ACCOUNT_TITLE?.trim() || "",
  accountNumber: process.env.PAYMENT_ACCOUNT_NUMBER?.trim() || "",
  iban: process.env.PAYMENT_IBAN?.trim() || "",
  jazzcash: process.env.PAYMENT_JAZZCASH?.trim() || "",
  easypaisa: process.env.PAYMENT_EASYPAISA?.trim() || "",
  note: "Send the transaction ID or a screenshot to billing@searchable.pk with your invoice number. Plans activate within one working day of payment.",
};
export const PAYMENT_DETAILS_SET = !!PAYMENT_INSTRUCTIONS.accountNumber || !!PAYMENT_INSTRUCTIONS.jazzcash || !!PAYMENT_INSTRUCTIONS.easypaisa;

/** Free-tier honesty: what everyone gets without paying. */
export const FREE_FEATURES = ["Listing with address, phone, hours, map link and category", "Claim it and edit it yourself", "Collect reviews", "Appear in search and city pages"];
