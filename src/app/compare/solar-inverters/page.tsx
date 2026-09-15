import Link from "next/link";
import { ToolCard } from "@/components/cards";
import { InverterCompare } from "@/components/compare/inverter-compare";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { BATTERIES, INVERTER_TYPES, INVERTERS, INVERTERS_REVIEWED_AT, INVERTERS_SOURCE, type InverterType } from "@/content/inverters";
import { formatDate, pkr } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { getTool } from "@/tools/registry";

const FAQS = [
  { question: "What is the price of a 5 kW solar inverter in Pakistan?", answer: "A 5–6 kW hybrid inverter from Inverex, Ziewnic, Deye or Solis costs Rs 160,000–275,000 in 2026. A 5 kW on-grid inverter (Solis, Growatt, Sungrow, GoodWe) is Rs 90,000–135,000. Off-grid 5–6 kW units are Rs 85,000–135,000 but cannot be net-metered." },
  { question: "What is the price of a 10 kW inverter in Pakistan?", answer: "Three-phase 10 kW on-grid inverters cost Rs 160,000–240,000 (Growatt, Solis, Sungrow) and Rs 235,000–280,000 for Huawei. 10–12 kW hybrids run Rs 310,000–500,000 depending on brand." },
  { question: "Which is the best solar inverter in Pakistan?", answer: "For most homes a 6 kW hybrid with two MPPTs, 48 V lithium support and a 5-year warranty backed by a local service centre. Inverex and Ziewnic win on price and service coverage; Solis, Deye and Huawei on build quality and grid compliance. Avoid brands without a service centre in your city." },
  { question: "Hybrid vs on-grid inverter — which should I buy?", answer: "If your area has load-shedding or you want backup at night, buy a hybrid and add a battery later. If the grid is reliable and you only want to cut the bill, an on-grid inverter is roughly half the price for the same kW and qualifies for net metering." },
  { question: "Can I get net metering with an off-grid inverter?", answer: "No. DISCOs only approve grid-tied or hybrid inverters with the required anti-islanding and grid-code certification. Off-grid units are for sites without a WAPDA connection." },
  { question: "How much inverter do I need for a 5 kW system?", answer: "Match the inverter to your load, not the panel count: a 5–6 kW single-phase inverter runs two 1.5-ton inverter ACs plus normal load. Inverters accept 30–50% more panel capacity than their rated output, so 6.5–8 kW of panels on a 6 kW inverter is normal." },
  { question: "Is there sales tax on inverters in Pakistan?", answer: "Yes — unlike panels, inverters and batteries attract sales tax and customs duty at import, which is why prices move with the dollar and the budget. Check the review date on this page." },
];

const TYPE_ORDER: InverterType[] = ["hybrid", "on-grid", "off-grid"];

export const metadata = buildMetadata({
  title: "Solar Inverter Price in Pakistan 2026 — Compare Hybrid, On-Grid & Off-Grid Inverters (3kW, 5kW, 10kW)",
  description: "Compare solar inverter prices in Pakistan for Inverex, Ziewnic, Solis, Deye, Growatt, Sungrow, Huawei and more. Hybrid, on-grid and off-grid inverters from 3 kW to 12 kW with warranty, MPPT, battery voltage and dealer prices — updated monthly.",
  path: "/compare/solar-inverters",
  kicker: "Compare",
});

function range(list: { price: [number, number] }[]): [number, number] {
  return [Math.min(...list.map((i) => i.price[0])), Math.max(...list.map((i) => i.price[1]))];
}

export default function SolarInverterComparePage() {
  const crumbs = [{ name: "Compare", path: "/compare/solar-inverters" }, { name: "Solar inverters", path: "/compare/solar-inverters" }];
  const solarTool = getTool("solar-payback-calculator")!;
  const acTool = getTool("ac-running-cost-calculator")!;
  const sizeRows = [
    { label: "3–4 kW", test: (kw: number) => kw < 4.5 },
    { label: "5–6 kW", test: (kw: number) => kw >= 4.5 && kw <= 6.5 },
    { label: "8 kW", test: (kw: number) => kw > 6.5 && kw <= 8 },
    { label: "10–12 kW", test: (kw: number) => kw > 8 },
  ];

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          faqJsonLd(FAQS),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Solar inverter prices in Pakistan",
            numberOfItems: INVERTERS.length,
            itemListElement: INVERTERS.map((i, n) => ({
              "@type": "ListItem",
              position: n + 1,
              item: { "@type": "Product", name: `${i.brand} ${i.model}`, brand: { "@type": "Brand", name: i.brand }, offers: { "@type": "AggregateOffer", priceCurrency: "PKR", lowPrice: i.price[0], highPrice: i.price[1], offerCount: 3 } },
            })),
          },
        ]}
      />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow="Compare" title="Solar inverter price in Pakistan" description={`Dealer prices for ${INVERTERS.length} hybrid, on-grid and off-grid inverters from 3 kW to 12 kW. Filter by type and size, then tick up to three to compare specs side by side. Market survey updated ${formatDate(INVERTERS_REVIEWED_AT)}.`} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section className="border-y-2 border-[var(--rule)] py-5">
            <p className="eyebrow">Inverter price by size, 2026</p>
            <table className="mt-3 w-full text-[15px]">
              <thead className="text-left text-xs uppercase tracking-wider text-3">
                <tr className="border-b border-[var(--rule)]">
                  <th className="py-2 pr-3 font-medium">Size</th>
                  {TYPE_ORDER.map((t) => (
                    <th key={t} className="py-2 pr-3 text-right font-medium">
                      {INVERTER_TYPES[t].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sizeRows.map((r) => (
                  <tr key={r.label}>
                    <td className="py-2 pr-3 font-medium">{r.label}</td>
                    {TYPE_ORDER.map((t) => {
                      const list = INVERTERS.filter((i) => i.type === t && r.test(i.kw));
                      if (!list.length) return <td key={t} className="py-2 pr-3 text-right text-3">—</td>;
                      const [lo, hi] = range(list);
                      return (
                        <td key={t} className="py-2 pr-3 text-right tabular whitespace-nowrap">
                          {pkr(lo)} – {pkr(hi)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Which type do you need?</h2>
            <dl className="mt-3 divide-y divide-[var(--border)] border-y border-line">
              {TYPE_ORDER.map((t) => {
                const [lo, hi] = range(INVERTERS.filter((i) => i.type === t));
                return (
                  <div key={t} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[8rem_1fr_auto]">
                    <dt className="font-medium">{INVERTER_TYPES[t].name}</dt>
                    <dd className="text-[15px] text-2">{INVERTER_TYPES[t].blurb}</dd>
                    <dd className="text-right text-sm tabular text-3 whitespace-nowrap">
                      {pkr(lo)} – {pkr(hi)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Compare inverters</h2>
            <p className="mt-2 mb-4 text-[15px] text-2">Every model we track, with what actually matters: MPPT count, battery voltage, net-metering eligibility and warranty.</p>
            <InverterCompare inverters={INVERTERS} />
            <p className="mt-2 text-xs text-3">
              {INVERTERS_SOURCE.title}. Reviewed {formatDate(INVERTERS_REVIEWED_AT)}. Prices move with the dollar rate and container arrivals; retail single-unit prices can be 5–10% higher.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Lithium battery prices (for hybrids)</h2>
            <table className="mt-3 w-full text-[15px]">
              <thead className="text-left text-xs uppercase tracking-wider text-3">
                <tr className="border-b border-[var(--rule)]">
                  <th className="py-2 pr-3 font-medium">Battery</th>
                  <th className="py-2 pr-3 text-right font-medium">kWh</th>
                  <th className="py-2 pr-3 text-right font-medium">Warranty</th>
                  <th className="py-2 text-right font-medium">Price (Rs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {BATTERIES.map((b) => (
                  <tr key={`${b.brand}-${b.model}`}>
                    <td className="py-2 pr-3">
                      <span className="font-medium">{b.brand}</span> {b.model}
                    </td>
                    <td className="py-2 pr-3 text-right tabular">{b.kwh}</td>
                    <td className="py-2 pr-3 text-right tabular">{b.warrantyYears} yr</td>
                    <td className="py-2 text-right tabular whitespace-nowrap">
                      {pkr(b.price[0])} – {pkr(b.price[1])}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[15px] text-2">One 5 kWh pack runs fans, lights, fridge and one inverter AC through a 4–5 hour outage. Two packs are typical for whole-night backup.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl">How to choose</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[16px] leading-relaxed">
              <li><strong>Size to your load, not your roof.</strong> Add up what runs at once on a summer evening (each 1.5-ton inverter AC ≈ 1.2–1.8 kW). A 6 kW single-phase hybrid covers most 5–10 marla houses; go three-phase above 8 kW or if your meter is three-phase.</li>
              <li><strong>Two MPPTs minimum.</strong> Roofs facing two directions, or partial shade, need independent strings. Budget off-grid units have one.</li>
              <li><strong>48 V battery bus</strong> for anything hybrid — the standard for lithium packs from every brand. Huawei uses its own high-voltage LUNA battery.</li>
              <li><strong>Check net-metering approval.</strong> Your DISCO’s list of approved inverters matters more than the spec sheet. All hybrid and on-grid units here are commonly approved; off-grid never is.</li>
              <li><strong>Warranty is only as good as the service centre.</strong> Ask where the nearest one is and whether the warranty is replacement or repair. Five years is standard; Huawei gives ten.</li>
              <li><strong>Get three quotes</strong> for the installed system, not the inverter alone — installers bundle margin into structure and wiring. Use the <Link href="/tools/solar/solar-payback-calculator" className="underline underline-offset-4">Solar System Calculator</Link> to size from your bill first.</li>
            </ol>
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
          <ToolCard tool={acTool} />
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">Related</p>
            <ul className="mt-2 space-y-1.5">
              <li><Link href="/data/solar-panel-price" className="underline-offset-4 hover:underline">Solar panel price per watt today</Link></li>
              <li><Link href="/guides/utilities/how-to-apply-for-net-metering-in-pakistan" className="underline-offset-4 hover:underline">How to apply for net metering</Link></li>
              <li><Link href="/businesses/solar-companies" className="underline-offset-4 hover:underline">Solar installers near you</Link></li>
              <li><Link href="/data/usd-pkr" className="underline-offset-4 hover:underline">Dollar rate today (inverters are priced in USD)</Link></li>
              <li><Link href="/electricity" className="underline-offset-4 hover:underline">Electricity bill check &amp; tariff</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
