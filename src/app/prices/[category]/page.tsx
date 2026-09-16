import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandChips, PriceTable } from "@/components/prices/price-table";
import { Breadcrumbs, EmptyState, JsonLd, SectionHeader } from "@/components/ui";
import { formatDate, pkr } from "@/lib/format";
import { PRICE_CATEGORIES, PRICE_CATEGORY_META, PRICE_INDEX_MIN, readPriceSet, type PriceCategory } from "@/lib/prices-data";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ category: string }> };

function isCategory(c: string): c is PriceCategory {
  return (PRICE_CATEGORIES as readonly string[]).includes(c);
}

const TITLES: Record<PriceCategory, { title: string; description: string; h1: string }> = {
  mobiles: { title: "Mobile Prices in Pakistan 2026: Every Phone, Official Price List", description: "Mobile phone prices in Pakistan today for Samsung, Vivo, Infinix, Tecno, Xiaomi, Oppo, Realme, iPhone and more, from the official price lists, with specs, PTA tax and price history.", h1: "Mobile prices in Pakistan" },
  bikes: { title: "Bike Prices in Pakistan 2026: Honda, Suzuki, Yamaha, United, Road Prince", description: "Motorcycle prices in Pakistan from the makers' official lists: Honda CD 70 and 125, Suzuki, Yamaha, United, Road Prince and electric bikes, with engine, mileage and price history.", h1: "Bike prices in Pakistan" },
  cars: { title: "Car Prices in Pakistan 2026 by Model: Suzuki, Toyota, Honda, Kia, BYD", description: "New car prices in Pakistan by model and variant from the makers' official lists: Alto, Cultus, Swift, City, Civic, Corolla, Yaris, Fortuner, Sportage, BYD and more, with price history.", h1: "Car prices in Pakistan" },
};

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  if (!isCategory(category)) return {};
  const set = await readPriceSet(category);
  return buildMetadata({ ...TITLES[category], path: `/prices/${category}`, noindex: set.items.length < PRICE_INDEX_MIN, kicker: PRICE_CATEGORY_META[category].name });
}

export default async function PriceCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  const meta = PRICE_CATEGORY_META[category];
  const set = await readPriceSet(category);
  const items = [...set.items].sort((a, b) => a.price - b.price);
  const crumbs = [
    { name: "Prices", path: "/prices" },
    { name: meta.name, path: `/prices/${category}` },
  ];
  const cheapest = items[0];
  const dearest = items[items.length - 1];
  const faqs = items.length
    ? [
        { question: `What is the cheapest ${meta.singular} in Pakistan right now?`, answer: `${cheapest.brand} ${cheapest.model} at ${pkr(cheapest.price)} is the cheapest ${meta.singular} on the official price lists we track; ${dearest.brand} ${dearest.model} at ${pkr(dearest.price)} is the dearest.` },
        { question: "Where do these prices come from?", answer: `Each price is the maker's official Pakistan price (or an authorised seller's list) on the date shown on the model page. When a maker revises a price the old one stays in the model's history.` },
        ...(category === "mobiles" ? [{ question: "Do these prices include PTA tax?", answer: "Yes for phones bought in Pakistan: official retail prices are for PTA-approved units. The PTA tax shown on each model page is what you would pay to register a unit brought from abroad on a passport or CNIC." }] : []),
      ]
    : [];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={set.reviewedAt ? `Reviewed ${formatDate(set.reviewedAt, { day: "numeric", month: "long", year: "numeric" })}` : meta.name} title={TITLES[category].h1} description={`${items.length ? `${items.length} models` : "Models"} at the makers' official Pakistan prices, cheapest first. Open a model for variants, specs and the price history.`} />
      {items.length ? (
        <>
          <div className="mb-6">
            <BrandChips category={category} items={set.items} />
          </div>
          <PriceTable category={category} items={items} />
          {faqs.length ? (
            <>
              <SectionHeader title="Questions" className="mt-10" />
              <div className="divide-y divide-[var(--border)] border-y border-line">
                {faqs.map((f) => (
                  <details key={f.question} className="py-3">
                    <summary className="cursor-pointer list-none font-semibold">{f.question}</summary>
                    <p className="mt-2 text-[15px] text-2">{f.answer}</p>
                  </details>
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <EmptyState title="Being compiled" description={`The ${meta.name.toLowerCase()} list is being built from the makers' official price lists. Check back soon.`} action={<Link href="/prices" className="underline underline-offset-4">Other price lists</Link>} />
      )}
    </div>
  );
}
