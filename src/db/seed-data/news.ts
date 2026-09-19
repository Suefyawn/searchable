import type { ArticleDef } from "./guides";

/**
 * SAMPLE news for the local prototype. These are explainer-style pieces built on stable facts
 * (slabs, mechanisms, processes) rather than invented events, so nothing here misleads if seen.
 * Real daily news is written in the CMS from Day 1 and replaces these before go-live.
 */
export const NEWS: ArticleDef[] = [
  {
    slug: "what-the-2025-26-salary-tax-slabs-mean-for-your-take-home",
    category: "economy",
    title: "What the FY2025-26 salary tax slabs mean for your monthly take-home",
    dek: "The lowest two brackets were cut in the Finance Act 2025. Here is the effect on salaries from Rs 60,000 to Rs 500,000 a month, worked through.",
    featured: true,
    publishedDaysAgo: 1,
    entities: ["fbr", "income-tax"],
    body: `The Finance Act 2025 reduced the rate on the first taxable bracket for salaried individuals from 5% to **1%** and the second from 15% to **11%**, while leaving the exemption threshold at Rs 600,000 a year. The surcharge on very high incomes was trimmed from 10% to 9%.

## Who benefits most

The relief is concentrated on salaries between Rs 50,000 and Rs 183,000 a month, the range where most formal-sector employees sit.

| Monthly salary | Annual tax FY2024-25 | Annual tax FY2025-26 | Saving / year |
|---|---|---|---|
| Rs 75,000 | Rs 15,000 | Rs 3,000 | Rs 12,000 |
| Rs 100,000 | Rs 30,000 | Rs 6,000 | Rs 24,000 |
| Rs 150,000 | Rs 120,000 | Rs 72,000 | Rs 48,000 |
| Rs 250,000 | Rs 380,000 | Rs 300,000 | Rs 80,000 |
| Rs 500,000 | Rs 1,365,000 | Rs 1,281,000 | Rs 84,000 |

Above Rs 4.1 million a year (about Rs 342,000 a month) the marginal rate stays at 35%, so the saving flattens.

## What to do

- Check your own figure with the [Income Tax Calculator](/tools/tax/income-tax-calculator).
- If your employer is still deducting at last year's rates, ask HR to update the withholding schedule; the excess is refundable only after you file a return.
- Not on the Active Taxpayer List yet? [Becoming a filer](/guides/taxes/how-to-become-a-tax-filer-in-pakistan) takes 20 minutes and cuts withholding on cars, property and bank profit.`,
    sources: [{ title: "Finance Act 2025", publisher: "Government of Pakistan" }],
  },
  {
    slug: "how-petrol-prices-are-set-in-pakistan-every-fortnight",
    category: "economy",
    title: "How petrol prices are set in Pakistan: and why they change every two weeks",
    dek: "The fortnightly revision follows a formula: international product prices, the rupee, and a stack of government levies that now make up over a third of the pump price.",
    publishedDaysAgo: 2,
    entities: ["ogra", "petrol", "usd-pkr"],
    body: `Every 1st and 16th of the month, the Finance Division announces petrol and diesel prices for the next fortnight on OGRA's recommendation. The number is not arbitrary; it is a sum of components.

## What is in a litre

1. **Ex-refinery / import price**, Platts Arab Gulf average for the previous fortnight, converted at the interbank rupee rate.
2. **Inland freight equalisation margin**, so the price is the same nationwide.
3. **Oil marketing company and dealer margins**, fixed per litre, revised occasionally.
4. **Petroleum levy**, a fixed per-litre tax that has become the government's main revenue lever on fuel.
5. **Sales tax**, currently zero-rated on petrol and diesel; the levy does the work instead.

Because the levy is fixed per litre, a fall in international prices does not pass through fully when the government chooses to raise the levy in the same revision.

## Why the rupee matters

A 1% move in USD/PKR moves the import component by roughly Rs 1.5–2 per litre. Track it on our [dollar rate](/e/usd-pkr) page.

## What it means for you

- Fuel cost per kilometre for a 1,300 cc sedan at 12 km/l: about Rs 22 per km at current prices.
- Diesel drives transport and food prices with a lag of 2–4 weeks.

Searchable records every revision on the [petrol price](/e/petrol) hub.`,
    sources: [{ title: "OGRA: Petroleum pricing mechanism", url: "https://ogra.org.pk", publisher: "OGRA" }],
  },
  {
    slug: "pta-tax-on-iphone-17-what-you-will-actually-pay",
    category: "technology",
    title: "PTA tax on the iPhone 17: what you will actually pay on passport vs CNIC",
    dek: "The new iPhones fall in the top DIRBS slab. Registering within 60 days of arrival on a passport saves a meaningful amount over CNIC.",
    featured: true,
    publishedDaysAgo: 3,
    entities: ["pta", "apple", "fbr"],
    body: `Apple's September launch puts the iPhone 17 line squarely in the highest DIRBS value bracket (above $500), where the tax is a fixed amount plus sales tax on the phone's value.

## The two routes

- **Passport (within 60 days of arrival):** lower fixed duty. The clock starts on the arrival stamp date.
- **CNIC:** higher fixed duty, available any time.

For a $999 base model at today's rate, the difference between the two routes is roughly the price of a mid-range Android phone. Run your exact model through the [PTA Tax Calculator](/tools/telecom/pta-mobile-tax-calculator).

## Should you buy local or import?

Locally sold "PTA-approved" units already include the tax in the price. Imported units are cheaper up front but you pay the tax to use them beyond 120 days. Compare the all-in figure, and factor in the warranty, Apple's warranty is regional.

## How to register

The full process, IMEI check, DIRBS application, PSID payment, is in our guide: [How to register an imported phone with PTA](/guides/telecom/how-to-register-phone-with-pta).`,
    sources: [{ title: "PTA DIRBS", url: "https://dirbs.pta.gov.pk", publisher: "PTA" }],
  },
  {
    slug: "sbp-policy-rate-explained-what-11-percent-means-for-loans-and-savings",
    category: "economy",
    title: "The SBP policy rate explained: what 11% means for your car loan, mortgage and savings",
    dek: "The policy rate anchors KIBOR, which sets the price of almost every loan in Pakistan. Here is how a change flows through to instalments and deposit returns.",
    publishedDaysAgo: 4,
    entities: ["sbp", "meezan-bank", "hbl"],
    body: `The State Bank's Monetary Policy Committee sets the **policy rate** roughly every six to eight weeks. Banks price loans off **KIBOR**, the interbank rate, which tracks the policy rate closely.

## Loans

A car loan is typically priced at 1-year KIBOR + 2–4%. At an 11% policy rate, that puts most car financing at 13–15%. On a Rs 3 million loan over five years, each 1% change in the rate moves the monthly instalment by about Rs 1,500. Model it with the [Car Loan Calculator](/tools/cars/car-loan-calculator).

Home finance is similar but longer, a 1% change on a 20-year Rs 10 million mortgage is roughly Rs 6,500 a month.

## Savings

Bank savings accounts must pay at least the policy rate minus a spread on PLS deposits. National Savings and Naya Pakistan Certificates re-price with a lag.

## What to watch

Inflation prints (monthly CPI), the rupee, and the IMF programme reviews shape the committee's decisions. Searchable tracks the rate history on the [SBP hub](/e/sbp).`,
    sources: [{ title: "SBP: Monetary Policy Decisions", url: "https://www.sbp.org.pk", publisher: "State Bank of Pakistan" }],
  },
  {
    slug: "electricity-bill-slabs-why-crossing-200-units-costs-so-much",
    category: "pakistan",
    title: "Why crossing 200 units makes your electricity bill jump",
    dek: "Protected consumers pay a fraction of the unprotected tariff. One high-usage month can push you out of the protected category for six months.",
    publishedDaysAgo: 5,
    entities: ["nepra", "lesco", "k-electric"],
    body: `NEPRA's residential tariff has two tracks. **Protected** consumers, those using 200 units or less for six consecutive months, pay subsidised slab rates. Everyone else is **unprotected**, with rates roughly three to four times higher per unit.

## The cliff

A household that used 190 units in each of the last six months and then uses 210 units in a hot month loses protected status. The next six bills are charged at unprotected rates even if usage drops back below 200.

## Above 200, the slab benefit disappears

For unprotected consumers using more than 200 units, the **entire** consumption is billed at the rate of the highest slab reached, not just the units within it. Going from 300 to 301 units re-prices all 301 units.

## Practical moves

- Read the meter mid-month; a small change in AC hours can keep you under a threshold.
- Compare the all-in per-unit cost with the [Electricity Bill Calculator](/tools/utilities/electricity-bill-calculator).
- If you regularly use 400+ units, a solar system pays back in 3–5 years at today's tariffs, see the [Solar Payback Calculator](/tools/solar/solar-payback-calculator) and [solar installers](/businesses/solar-companies).`,
    sources: [{ title: "NEPRA: Consumer-end tariff", url: "https://nepra.org.pk", publisher: "NEPRA" }],
  },
  {
    slug: "how-gold-prices-in-pakistan-are-quoted-and-why-they-differ-from-the-world-rate",
    category: "business",
    title: "How gold is priced in Pakistan and why the local rate differs from the international one",
    dek: "Per tola, per 10 grams, 24k vs 22k, the Sarafa rate is derived from the world price, the rupee, and a local premium that widens when supply is tight.",
    publishedDaysAgo: 6,
    entities: ["gold", "usd-pkr"],
    body: `Pakistan quotes gold **per tola** (11.664 g) and **per 10 grams**, in 24-karat and 22-karat. The All Pakistan Sarafa Gems and Jewellers Association publishes daily rates for Karachi and Lahore.

## The derivation

Local rate ≈ (international spot price per ounce ÷ 31.1035 × 11.664) × USD/PKR + local premium.

The premium reflects import duties, dealer margins and short-term demand, it is highest in wedding season and around Eid.

## Zakat and gold

Gold held for a lunar year is zakatable at 2.5% of its value under the majority view. The [Zakat Calculator](/tools/finance/zakat-calculator) uses today's rate and lets you switch between gold and silver nisab.

Searchable logs the daily Sarafa rate on the [gold hub](/e/gold).`,
    sources: [{ title: "All Pakistan Sarafa Gems and Jewellers Association", publisher: "APSGJA" }],
  },
  {
    slug: "filer-vs-non-filer-what-you-pay-extra-on-cars-property-and-bank-transactions",
    category: "economy",
    title: "Filer vs non-filer: what you pay extra on cars, property and bank transactions",
    dek: "The Income Tax Ordinance's Tenth Schedule doubles many withholding rates for people not on the Active Taxpayer List. The gap is now large enough to matter on a mid-size car.",
    publishedDaysAgo: 8,
    entities: ["fbr", "income-tax"],
    body: `Pakistan uses withholding tax as a stick: if you are not on the **Active Taxpayer List**, most withholding rates are applied at 100% higher (and sometimes more).

## Where the gap bites

- **Vehicle registration** (section 231B), slabs by engine capacity; the non-filer rate is roughly double.
- **Property purchase and sale** (236C/236K), the difference on a Rs 20 million plot runs into hundreds of thousands of rupees.
- **Cash withdrawals** above the daily threshold, a percentage for non-filers only.
- **Profit on debt**, 15% for filers vs a much higher rate for non-filers.
- **Dividends, prize bonds, mobile top-ups**, higher for non-filers.

## The fix is cheap

Registration on IRIS is free; filing a salaried return takes under an hour. Our [step-by-step guide](/guides/taxes/how-to-become-a-tax-filer-in-pakistan) walks through it, and [tax consultants](/businesses/tax-consultants) will do it for a few thousand rupees.`,
    sources: [{ title: "Income Tax Ordinance 2001: Tenth Schedule", publisher: "FBR" }],
  },
  {
    slug: "solar-boom-pakistan-what-a-5kw-system-costs-and-saves",
    category: "technology",
    title: "Pakistan's rooftop solar boom: what a 5 kW system costs and saves in 2026",
    dek: "Panel prices have fallen far enough that a typical 5 kW system pays back in three to five years for households using 400–700 units a month.",
    publishedDaysAgo: 9,
    entities: ["solar-energy", "nepra"],
    body: `Pakistan has become one of the world's fastest-growing rooftop solar markets, driven by high tariffs and cheap Chinese panels.

## What 5 kW costs

Installed quotes for a 5 kW on-grid system with tier-1 panels and a branded inverter typically range from Rs 550,000 to Rs 800,000 depending on city, mounting structure and brand. Hybrid systems with batteries cost considerably more.

## What it produces

At 4.5 peak sun hours (Lahore average) and 80% system efficiency, a 5 kW system yields about 540 units a month, enough to offset most of a 500-unit household's consumption.

## Payback

For a household paying Rs 40–48 per unit all-in, annual savings of Rs 200,000–250,000 imply a 3–4 year payback. The [Solar Payback Calculator](/tools/solar/solar-payback-calculator) lets you enter your own units and quotes.

## Before you buy

- Get three quotes from [listed installers](/businesses/solar-companies) and check AEDB certification.
- Understand net metering, the [application guide](/guides/utilities/how-to-apply-for-net-metering-in-pakistan) explains costs and timelines.
- Shift daytime loads (AC, pumps, laundry) to maximise self-consumption.`,
    sources: [{ title: "NEPRA State of Industry Report", url: "https://nepra.org.pk", publisher: "NEPRA" }],
  },
  {
    slug: "lahore-food-guide-where-locals-actually-eat",
    category: "lifestyle",
    title: "Lahore food guide: where locals actually eat, from Mall Road to DHA",
    dek: "Skip the tourist lists. These are the kitchens Lahoris queue at, barbecue on Mall Road, karahi in Gulberg, and the DHA cafés worth the drive.",
    publishedDaysAgo: 11,
    city: "lahore",
    entities: ["lahore"],
    body: `Lahore's food scene runs on three things: charcoal, desi ghee and late nights.

## The classics

- **Bundu Khan, Mall Road**, seekh kababs and tikkas since 1948. [Listing](/b/bundu-khan-lahore).
- **Butt Karahi, Gulberg**, karahi by the kilo; go hungry and go in a group. [Listing](/b/butt-karahi-lahore).
- **Phajja Siri Paye, Lakshmi Chowk**, for the brave, at dawn.

## Modern Lahore

- **Café Aylanto, Gulberg**, the business-lunch standard. [Listing](/b/cafe-aylanto-lahore).
- The DHA Phase 5–6 café strip for coffee and brunch.

## Practical

Most family restaurants run past midnight on weekends. Gulberg and DHA have easy parking; Mall Road does not, use a ride-hailing app.

Browse all [restaurants in Lahore](/businesses/restaurants/lahore) on Searchable, with hours, phone and WhatsApp.`,
  },
  {
    slug: "karachi-guide-getting-around-the-city",
    category: "lifestyle",
    title: "Karachi for newcomers: getting around, where to live, and what things cost",
    dek: "Pakistan's largest city rewards those who learn its geography. A practical orientation for people moving in for work.",
    publishedDaysAgo: 13,
    city: "karachi",
    entities: ["karachi", "k-electric"],
    body: `## The map in one paragraph

Karachi spreads west to east along the coast. **Clifton and DHA** in the south are the upscale residential and dining zones; **Saddar** is the old commercial core; **Gulshan-e-Iqbal** and **Gulistan-e-Johar** are dense middle-class districts; the **North** (Nazimabad, North Karachi) is older and more affordable.

## Getting around

Ride-hailing dominates. The Green Line BRT runs north–south through the centre. Traffic peaks 8–10 am and 5–8 pm.

## Utilities

Electricity is supplied by **K-Electric**, not a WAPDA DISCO, billing and complaints run through KE's app. Water is often tankered in newer schemes; ask before renting.

## Costs

A two-bedroom apartment in Gulshan rents for far less than the same in DHA. Solar with [KE net metering](/businesses/solar-companies/karachi) is popular given load-shedding history.

Explore [businesses in Karachi](/cities/karachi), hospitals, schools, restaurants and services with contact details.`,
  },
];
