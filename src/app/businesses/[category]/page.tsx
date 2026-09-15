import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCard } from "@/components/cards";
import { Breadcrumbs, EmptyState, JsonLd, SectionHeader } from "@/components/ui";
import { cityCountsForCategory, countBusinesses, getBusinessCategory, listBusinesses } from "@/db/queries/directory";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const revalidate = 3600;
type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  const cat = await getBusinessCategory(category);
  if (!cat) return {};
  const n = await countBusinesses({ categoryId: cat.id });
  return buildMetadata({
    title: `${cat.namePlural ?? cat.name} in Pakistan`,
    description: `${n ? `${n} ` : ""}${(cat.namePlural ?? cat.name).toLowerCase()} across Pakistan with phone, WhatsApp, hours and reviews. Choose your city.`,
    path: `/businesses/${cat.slug}`,
    noindex: n < 5,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = await getBusinessCategory(category);
  if (!cat) notFound();
  const [cities, top] = await Promise.all([cityCountsForCategory(cat.id), listBusinesses({ categoryId: cat.id, limit: 12 })]);
  const plural = cat.namePlural ?? cat.name;
  const crumbs = [{ name: "Businesses", path: "/businesses" }, { name: plural, path: `/businesses/${cat.slug}` }];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" title={`${plural} in Pakistan`} description={cat.description ?? `Find ${plural.toLowerCase()} near you. Pick a city to see listings with hours, phone and WhatsApp.`} />
      {cities.length ? (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">By city</h2>
          <ul className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={c.id}>
                <Link href={`/businesses/${cat.slug}/${c.slug}`} className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-medium hover:bg-surface-3 transition-colors">
                  {plural} in {c.name} <span className="tabular text-3">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {top.length ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">Top rated</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {top.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState title={`No ${plural.toLowerCase()} listed yet`} description="Know one? Add it in a minute — it is free." action={<Link href="/add-business" className="text-sm font-medium text-brand-700">Add a business →</Link>} />
      )}
    </div>
  );
}
