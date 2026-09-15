import Link from "next/link";
import { Suspense } from "react";
import { ToolCard, toolExample } from "@/components/cards";
import { CarCompare } from "@/components/compare/car-compare";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { BODY_LABELS, CARS, CARS_REVIEWED_AT, CARS_SOURCE, type Body } from "@/content/cars";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { getTool } from "@/tools/registry";

const lakh = (n: number) => (n >= 1e7 ? `Rs ${(n / 1e7).toFixed(2).replace(/\.?0+$/, "")} crore` : `Rs ${(n / 1e5).toFixed(2).replace(/\.?0+$/, "")} lakh`);

const FAQS = [
  { question: "What is the Suzuki Alto price in Pakistan?", answer: "Rs 29.95 lakh for the VX to Rs 33.26 lakh for the VXL AGS (ex-factory, September 2026). Registration, token tax and withholding tax add roughly Rs 1.5–3 lakh depending on province and filer status." },
  { question: "Which is the cheapest new car in Pakistan?", answer: "The Suzuki Every van (Rs 29.65 lakh) and Suzuki Alto (Rs 29.95 lakh) are the cheapest new vehicles; the Changan Karvaan is the cheapest 7-seater and the Changan Alsvin the cheapest sedan. Nothing new sells under Rs 25 lakh any more." },
  { question: "Which new car gives the best fuel economy?", answer: "Among petrol cars the Alto (18–22 km/l) and Cultus. The Toyota Corolla Cross and Haval H6 hybrids do 18–23 km/l in city traffic. Electric cars (MG4, BYD Atto 3) cost about Rs 3–5 per km on home charging against Rs 15–20 per km for petrol." },
  { question: "Are electric cars worth it in Pakistan?", answer: "On running cost, yes: at Rs 40–60 per unit an EV costs a fifth of petrol per km, and EVs pay reduced registration and token tax in several provinces. The trade-offs are the higher purchase price, charging at home (three-phase helps) and thinner resale data. The MG Binguo at Rs 57 lakh is the entry point." },
  { question: "How much extra do non-filers pay when buying a car?", answer: "Withholding tax under section 231B is collected at registration and is far higher for non-filers: from about Rs 30,000 extra on an 850cc car to several lakh on a 2000cc+ SUV. Use the token tax calculator for the annual tax and get on the Active Taxpayer List before booking." },
  { question: "Are these prices final?", answer: "They are the assemblers' published ex-factory prices on the review date. Assemblers revise prices with the rupee and the budget, dealers may charge premium (own) on short-supply models, and imported (CBU) cars move with duty changes. Confirm with the dealer before paying a booking amount." },
];

export const metadata = buildMetadata({
  title: "Car Prices in Pakistan 2026: Compare New Cars: Alto, Swift, City, Corolla, Sportage, BYD & More",
  description: "Every new car on sale in Pakistan with ex-factory prices, engine, gearbox, fuel economy, airbags and seats. Filter by body, fuel and budget, compare three side by side, and jump to the car loan and token tax calculators.",
  path: "/compare/cars",
  kicker: "Compare",
});

export default function CarsComparePage() {
  const crumbs = [{ name: "Compare", path: "/compare/cars" }, { name: "New cars", path: "/compare/cars" }];
  const loan = getTool("car-loan-calculator")!;
  const token = getTool("token-tax-calculator")!;
  const fuelTool = getTool("fuel-cost-calculator")!;
  const bodies = Object.keys(BODY_LABELS) as Body[];
  const cheapest = [...CARS].sort((a, b) => a.price[0] - b.price[0]);

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          faqJsonLd(FAQS),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "New car prices in Pakistan",
            numberOfItems: CARS.length,
            itemListElement: CARS.map((c, n) => ({ "@type": "ListItem", position: n + 1, item: { "@type": "Product", name: `${c.brand} ${c.model}`, brand: { "@type": "Brand", name: c.brand }, offers: { "@type": "AggregateOffer", priceCurrency: "PKR", lowPrice: c.price[0], highPrice: c.price[1], offerCount: c.variants } } })),
          },
        ]}
      />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow="Compare" title="Car prices in Pakistan" description={`${CARS.length} new cars on sale from Suzuki, Toyota, Honda, Hyundai, Kia, Changan, MG, Haval and BYD with ex-factory prices and the specs that matter. Filter by body, fuel and budget; tick three to compare. Prices reviewed ${formatDate(CARS_REVIEWED_AT)}.`} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section className="border-y-2 border-[var(--rule)] py-5">
            <p className="eyebrow">Cheapest new car by body type</p>
            <table className="mt-3 w-full text-[15px]">
              <tbody className="divide-y divide-[var(--border)]">
                {bodies.map((b) => {
                  const c = cheapest.find((x) => x.body === b);
                  if (!c) return null;
                  return (
                    <tr key={b}>
                      <td className="py-2 pr-3 font-medium">{BODY_LABELS[b]}</td>
                      <td className="py-2 pr-3"><a href={`#${c.id}`} className="underline-offset-4 hover:underline">{c.brand} {c.model}</a> <span className="text-2">· {c.engineLabel}</span></td>
                      <td className="py-2 text-right tabular whitespace-nowrap">{lakh(c.price[0])}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="font-serif text-2xl">All new cars</h2>
            <p className="mt-2 mb-4 text-[15px] text-2">Ex-factory prices across variants. On-road cost adds registration, number plate, token tax and 231B withholding: use the calculators from the comparison.</p>
            <Suspense fallback={<p className="py-10 text-center text-[15px] text-2">Loading the comparison…</p>}>
              <CarCompare cars={CARS} />
            </Suspense>
            <p className="mt-2 text-xs text-3">
              Source: <a href={CARS_SOURCE.url} rel="nofollow noopener" target="_blank" className="underline-offset-2 hover:underline">{CARS_SOURCE.title}</a>, reviewed {formatDate(CARS_REVIEWED_AT)}. Specs from assembler brochures; economy figures are typical city driving, not test-cycle claims.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl">What the price does not include</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-relaxed">
              <li><strong>Registration and number plate</strong>, provincial Excise fee (roughly 1–4% of value by engine size) plus plate and smart-card charges.</li>
              <li><strong>Withholding tax u/s 231B</strong>, collected at registration; non-filers pay about three times the filer rate. Getting on the ATL before booking is the single biggest saving.</li>
              <li><strong>Token tax</strong>: annual for cars above 1000cc (a percentage of invoice value in Punjab and ICT since 2026), lifetime for ≤1000cc and motorcycles. See the <Link href="/tools/cars/token-tax-calculator" className="underline underline-offset-4">token tax calculator</Link>.</li>
              <li><strong>Own / premium</strong>, dealer mark-up on short-supply models; refuse it or wait for delivery at list price.</li>
              <li><strong>Insurance</strong>, 1.5–3% of value per year; mandatory for bank financing.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Frequently asked questions</h2>
            <dl className="mt-4 divide-y divide-[var(--border)] border-y border-line">
              {FAQS.map((f) => (
                <div key={f.question} className="py-4">
                  <dt className="font-medium">{f.question}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-2">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          <ToolCard tool={loan} example={toolExample(loan)} />
          <ToolCard tool={token} example={toolExample(token)} />
          <ToolCard tool={fuelTool} example={toolExample(fuelTool)} />
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">Related</p>
            <ul className="mt-2 space-y-1.5">
              <li><Link href="/guides/cars/online-vehicle-verification-in-pakistan-punjab-sindh-islamabad-and-kp-registrati" className="underline-offset-4 hover:underline">Verify a used car online before you pay</Link></li>
              <li><Link href="/tools/cars/car-registration-tax-calculator" className="underline-offset-4 hover:underline">Registration tax, filer vs non-filer</Link></li>
              <li><Link href="/data/petrol-price" className="underline-offset-4 hover:underline">Petrol price today</Link></li>
              <li><Link href="/businesses/car-dealers" className="underline-offset-4 hover:underline">Car dealers near you</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
