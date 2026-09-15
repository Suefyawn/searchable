import Link from "next/link";
import { ToolCard } from "@/components/cards";
import { Change } from "@/components/data/change";
import { LineChart } from "@/components/data/line-chart";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { INVERTERS } from "@/content/inverters";
import { SOLAR_PRICES } from "@/content/solar-prices";
import { getSeries } from "@/db/queries/data";
import { formatDate, number, pkr } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { getTool } from "@/tools/registry";

export const revalidate = 3600;

const FAQS = [
  { question: "What is the solar panel price per watt in Pakistan today?", answer: "Tier-1 A-grade panels (Longi, Jinko, JA, Canadian, Trina) sell for roughly Rs 27–31 per watt at dealer level in 2026, so a 580 W panel costs about Rs 16,000–18,000. B-grade and used panels are cheaper but come without warranty support." },
  { question: "How much does a 5 kW solar system cost in Pakistan?", answer: "Rs 550,000–800,000 installed for an on-grid system with tier-1 panels and a branded inverter. Hybrid systems with a lithium battery add Rs 250,000–450,000." },
  { question: "How many panels do I need for 5 kW?", answer: "Nine 580 W panels give 5.2 kW. Use the Solar System Calculator to size from your monthly units instead of guessing." },
  { question: "Why do solar prices change every week?", answer: "Panels are imported and priced in dollars; the rupee rate and Chinese module prices move weekly. Import duties and sales-tax changes in the budget cause step changes." },
  { question: "Longi vs Jinko — which is better in Pakistan?", answer: "Both are tier-1. Jinko's N-type modules lose slightly less output in extreme heat; Longi has the widest local availability and after-sales network. Price difference is usually under Rs 1 per watt." },
  { question: "Is there tax on solar panels in Pakistan?", answer: "Panels have been exempt from sales tax under the Sixth Schedule since 2022, though inverters and batteries are taxed. The budget can change this — check the review date on this page." },
];

export const metadata = buildMetadata({
  title: "Solar Panel Price in Pakistan Today (2026) — Per Watt Rate, 5kW & 10kW System Cost",
  description: "Latest solar panel prices in Pakistan per watt for Longi, Jinko, JA, Canadian and Trina, inverter and battery prices, and what a 3kW, 5kW, 10kW or 20kW system costs installed. Updated weekly with source.",
  path: "/data/solar-panel-price",
  kicker: "Solar",
});

export default async function SolarPricePage() {
  const data = await getSeries("solar-panel-per-watt", 365);
  const points = data?.points ?? [];
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const crumbs = [{ name: "Data", path: "/data" }, { name: "Solar panel price", path: "/data/solar-panel-price" }];
  const solarTool = getTool("solar-payback-calculator")!;
  const billTool = getTool("electricity-bill-calculator")!;

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(FAQS)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow="Solar" title="Solar panel price in Pakistan today" description={`Per-watt rates for tier-1 panels, inverter and battery prices, and installed system costs. Market survey updated ${formatDate(SOLAR_PRICES.reviewedAt)}.`} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          {latest ? (
            <section className="border-y-2 border-[var(--rule)] py-6">
              <p className="eyebrow">Tier-1 panel price per watt</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-3">
                <span className="font-serif text-5xl tabular">Rs {number(latest.value, 2)}</span>
                <span className="text-lg text-3">per watt</span>
                {previous ? <Change latest={latest.value} previous={previous.value} unit="PKR" /> : null}
              </p>
              <p className="mt-1 text-sm text-3">
                {formatDate(latest.date)} · a 580 W panel ≈ {pkr(latest.value * 580)} · dealer price, pallet quantity
              </p>
            </section>
          ) : null}

          {points.length > 1 ? (
            <section>
              <h2 className="font-serif text-2xl">Price trend</h2>
              <div className="mt-3 text-brand-700">
                <LineChart points={points.map((p) => ({ date: p.date, value: p.value }))} unit="Rs per watt" />
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="font-serif text-2xl">Solar panel prices by brand</h2>
            <table className="mt-3 w-full text-[15px]">
              <thead className="text-left text-xs uppercase tracking-wider text-3">
                <tr className="border-b border-[var(--rule)]">
                  <th className="py-2 pr-3 font-medium">Brand</th>
                  <th className="py-2 pr-3 font-medium">Grade</th>
                  <th className="py-2 pr-3 text-right font-medium">Watts</th>
                  <th className="py-2 pr-3 text-right font-medium">Rs / watt</th>
                  <th className="py-2 text-right font-medium">Per panel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {SOLAR_PRICES.panels.map((p) => (
                  <tr key={p.brand}>
                    <td className="py-2 pr-3">
                      {p.brand}
                      {p.note ? <span className="block text-xs text-3">{p.note}</span> : null}
                    </td>
                    <td className="py-2 pr-3 text-2">{p.tier}</td>
                    <td className="py-2 pr-3 text-right tabular">{p.watts} W</td>
                    <td className="py-2 pr-3 text-right tabular font-medium">Rs {p.perWatt}</td>
                    <td className="py-2 text-right tabular">{pkr(p.perWatt * p.watts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-3">
              {SOLAR_PRICES.source.title}. Reviewed {formatDate(SOLAR_PRICES.reviewedAt)}. Retail single-panel prices are 5–10% higher.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Inverter and battery prices</h2>
            <table className="mt-3 w-full text-[15px]">
              <tbody className="divide-y divide-[var(--border)] border-y border-line">
                {SOLAR_PRICES.inverters.map((i) => (
                  <tr key={i.type}>
                    <td className="py-2 pr-3">{i.type}</td>
                    <td className="py-2 text-right tabular">
                      {pkr(i.price[0])} – {pkr(i.price[1])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[15px]">
              Compare {INVERTERS.length} inverters by brand, size, warranty and price on the <Link href="/compare/solar-inverters" className="underline underline-offset-4">solar inverter price comparison</Link>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Solar system price in Pakistan (installed)</h2>
            <p className="mt-2 text-[15px] text-2">On-grid systems with tier-1 panels, branded inverter, structure, wiring and labour. Net-metering processing is usually extra (Rs 25,000–60,000).</p>
            <table className="mt-3 w-full text-[15px]">
              <tbody className="divide-y divide-[var(--border)] border-y border-line">
                {SOLAR_PRICES.systems.map((s) => (
                  <tr key={s.kw}>
                    <td className="py-2 pr-3 font-medium">{s.kw} kW system</td>
                    <td className="py-2 pr-3 text-2">~{Math.ceil((s.kw * 1000) / 580)} × 580 W panels</td>
                    <td className="py-2 text-right tabular">
                      {pkr(s.range[0])} – {pkr(s.range[1])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[15px]">
              Size your own system from your bill with the <Link href="/tools/solar/solar-payback-calculator" className="underline underline-offset-4">Solar System Calculator</Link>, then get three quotes from <Link href="/businesses/solar-companies" className="underline underline-offset-4">listed installers</Link>.
            </p>
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
          <ToolCard tool={solarTool} />
          <ToolCard tool={billTool} />
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">Related</p>
            <ul className="mt-2 space-y-1.5">
              <li><Link href="/electricity/net-metering" className="underline-offset-4 hover:underline">Net metering 2026: rules, approved inverters, how to apply</Link></li>
              <li><Link href="/news/technology/solar-boom-pakistan-what-a-5kw-system-costs-and-saves" className="underline-offset-4 hover:underline">What a 5 kW system costs and saves</Link></li>
              <li><Link href="/data/usd-pkr" className="underline-offset-4 hover:underline">Dollar rate today (panels are priced in USD)</Link></li>
              <li><Link href="/electricity" className="underline-offset-4 hover:underline">Electricity bill check &amp; tariff</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
