import Link from "next/link";
import { SectionHeader } from "@/components/ui";
import { CARS, CARS_REVIEWED_AT } from "@/content/cars";
import { INVERTERS, INVERTERS_REVIEWED_AT } from "@/content/inverters";
import { formatDate, pkr } from "@/lib/format";
import { readLivingSet } from "@/lib/compare-data";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Compare: Cars, Solar Inverters and More, Side by Side",
  description: "Structured comparisons with prices and the specs that matter: new cars in Pakistan, solar inverters, and more to come. Filter, pick three, compare.",
  path: "/compare",
  kicker: "Compare",
});

const lakh = (n: number) => (n >= 1e7 ? `Rs ${(n / 1e7).toFixed(1).replace(/\.0$/, "")} crore` : `Rs ${Math.round(n / 1e5)} lakh`);
const carLow = Math.min(...CARS.map((c) => c.price[0]));
const carHigh = Math.max(...CARS.map((c) => c.price[1]));
const invLow = Math.min(...INVERTERS.map((i) => i.price[0]));
const invHigh = Math.max(...INVERTERS.map((i) => i.price[1]));

const PAGES = [
  {
    href: "/compare/cars",
    title: "New cars",
    count: `${CARS.length} models`,
    range: `${lakh(carLow)} to ${lakh(carHigh)}`,
    facets: ["Body", "Fuel", "Budget"],
    specs: "Ex-factory price, engine, gearbox, city economy, airbags, seats",
    tools: "Car loan, token tax, fuel cost",
    reviewed: CARS_REVIEWED_AT,
  },
  {
    href: "/compare/solar-inverters",
    title: "Solar inverters",
    count: `${INVERTERS.length} models`,
    range: `${pkr(invLow)} to ${pkr(invHigh)}`,
    facets: ["Type", "Size", "Phase"],
    specs: "Price per kW, PV input, MPPT, battery voltage, efficiency, warranty",
    tools: "Solar payback",
    reviewed: INVERTERS_REVIEWED_AT,
  },
];

export const revalidate = 3600;

export default async function CompareHub() {
  const [acs, cards, packs, nsc] = await Promise.all([readLivingSet("air-conditioners"), readLivingSet("credit-cards"), readLivingSet("mobile-packages"), readLivingSet("national-savings")]);
  const living = [
    { href: "/compare/air-conditioners", title: "Air conditioners", count: acs.items.length ? `${acs.items.length} models` : "Being compiled", range: acs.items.length ? `${pkr(Math.min(...acs.items.map((i) => i.price)))} to ${pkr(Math.max(...acs.items.map((i) => i.price)))}` : "Inverter and non-inverter, 1 to 2 ton", facets: ["Tonnage", "Brand", "Type"], specs: "Brand list price, EER, T3, heat and cool, warranty", tools: "AC running cost, electricity bill", reviewed: acs.reviewedAt },
    { href: "/compare/national-savings", title: "National Savings schemes", count: nsc.items.length ? `${nsc.items.length} schemes` : "Being compiled", range: nsc.items.length ? `${Math.min(...nsc.items.map((i) => i.price)).toFixed(2)}% to ${Math.max(...nsc.items.map((i) => i.price)).toFixed(2)}% a year` : "Behbood, Regular Income, Defence, Special Savings", facets: ["Profit paid", "For", "Type"], specs: "Profit rate, payout, term, minimum, maximum, withholding", tools: "National Savings, zakat", reviewed: nsc.reviewedAt },
    { href: "/compare/mobile-packages", title: "Mobile packages", count: packs.items.length ? `${packs.items.length} bundles` : "Being compiled", range: packs.items.length ? `${pkr(Math.min(...packs.items.map((i) => i.price)))} to ${pkr(Math.max(...packs.items.map((i) => i.price)))}` : "Jazz, Zong, Telenor, Ufone", facets: ["Network", "Validity", "Price"], specs: "Data, rupees per GB, minutes, SMS, validity, code", tools: "Load tax", reviewed: packs.reviewedAt },
    { href: "/compare/credit-cards", title: "Credit cards", count: cards.items.length ? `${cards.items.length} cards` : "Being compiled", range: cards.items.length ? `Annual fee ${pkr(Math.min(...cards.items.map((i) => i.price)))} to ${pkr(Math.max(...cards.items.map((i) => i.price)))}` : "Fees, mark-up, minimum income", facets: ["Bank", "Annual fee", "Type"], specs: "Annual fee, mark-up, minimum income, cashback, lounge, fuel", tools: "Personal loan, income tax", reviewed: cards.reviewedAt },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <SectionHeader as="h1" eyebrow="Compare" title="Compare before you buy" description="Prices and specifications in one place, filters that match how people shop (budget, type, fuel), and a side-by-side for the final three that marks the best value in every row. Reviewed on a schedule; every page shows its date and source." />
      <div className="grid gap-6 md:grid-cols-2">
        {[...PAGES, ...living].map((p) => (
          <Link key={p.href} href={p.href} className="group flex flex-col border-t-2 border-[var(--rule)] pt-4 hover:bg-surface-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-3">{p.count}</p>
            <h2 className="mt-1 font-serif text-3xl font-medium leading-tight group-hover:underline underline-offset-4">{p.title}</h2>
            <p className="mt-2 text-[15px] text-2">{p.range}</p>
            <dl className="mt-4 grid gap-y-1.5 text-[14px] sm:grid-cols-[7rem_1fr]">
              <dt className="text-3">Filter by</dt>
              <dd>{p.facets.join(", ")}</dd>
              <dt className="text-3">Compare on</dt>
              <dd>{p.specs}</dd>
              <dt className="text-3">Then work out</dt>
              <dd>{p.tools}</dd>
            </dl>
            <p className="mt-4 text-[12.5px] text-3">{p.reviewed ? `Prices reviewed ${formatDate(p.reviewed)}` : "Sources checked before the first publication"}</p>
          </Link>
        ))}
      </div>
      <p className="mt-10 max-w-2xl text-[15px] text-2">
        Coming next: bank deposit rates, motorcycles. Suggest one at{" "}
        <a href="mailto:editorial@searchable.pk" className="underline underline-offset-4">
          editorial@searchable.pk
        </a>
        .
      </p>
    </div>
  );
}
