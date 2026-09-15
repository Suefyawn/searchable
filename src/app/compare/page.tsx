import Link from "next/link";
import { SectionHeader } from "@/components/ui";
import { CARS, CARS_REVIEWED_AT } from "@/content/cars";
import { INVERTERS, INVERTERS_REVIEWED_AT } from "@/content/inverters";
import { formatDate, pkr } from "@/lib/format";
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

export default function CompareHub() {
  return (
    <div className="container-x py-8 sm:py-12">
      <SectionHeader as="h1" eyebrow="Compare" title="Compare before you buy" description="Prices and specifications in one place, filters that match how people shop (budget, type, fuel), and a side-by-side for the final three that marks the best value in every row. Reviewed on a schedule; every page shows its date and source." />
      <div className="grid gap-6 md:grid-cols-2">
        {PAGES.map((p) => (
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
            <p className="mt-4 text-[12.5px] text-3">Prices reviewed {formatDate(p.reviewed)}</p>
          </Link>
        ))}
      </div>
      <p className="mt-10 max-w-2xl text-[15px] text-2">
        Coming next: credit cards, bank accounts and profit rates, mobile and internet packages, inverter ACs, motorcycles. Suggest one at{" "}
        <a href="mailto:editorial@searchable.pk" className="underline underline-offset-4">
          editorial@searchable.pk
        </a>
        .
      </p>
    </div>
  );
}
