import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCard } from "@/components/cards";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { categoryCounts, countBusinesses, listBusinesses } from "@/db/queries/directory";
import { getArea } from "@/db/queries/geo";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const revalidate = 3600;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ city: string; area: string }> };

/** Area hub, e.g. /cities/lahore/gulberg, categories with listings in the area plus the top-rated ones. */
export async function generateMetadata({ params }: Props) {
  const { city, area } = await params;
  const geo = await getArea(city, area);
  if (!geo) return {};
  const n = await countBusinesses({ areaId: geo.area.id });
  return buildMetadata({
    title: `${geo.area.name}, ${geo.city.name}: businesses and services`,
    description: `Restaurants, doctors, schools, workshops and more in ${geo.area.name}, ${geo.city.name}, with phone numbers, hours and reviews.`,
    path: `/cities/${geo.city.slug}/${geo.area.slug}`,
    noindex: n < 5,
  });
}

export default async function AreaPage({ params }: Props) {
  const { city, area } = await params;
  const geo = await getArea(city, area);
  if (!geo) notFound();
  const [allCats, top] = await Promise.all([categoryCounts(geo.city.id, geo.area.id), listBusinesses({ areaId: geo.area.id, limit: 9 })]);
  const cats = allCats.filter((c) => c.count > 0);
  const crumbs = [
    { name: "Cities", path: "/cities" },
    { name: geo.city.name, path: `/cities/${geo.city.slug}` },
    { name: geo.area.name, path: `/cities/${geo.city.slug}/${geo.area.slug}` },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" title={`${geo.area.name}, ${geo.city.name}`} description={`Businesses and services in ${geo.area.name}.`} />
      {cats.length ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">Find in {geo.area.name}</h2>
          <ul className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <li key={c.id}>
                <Link href={`/businesses/${c.slug}/${geo.city.slug}/${geo.area.slug}`} className="inline-flex items-center gap-2 border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
                  {c.namePlural ?? c.name} <span className="tabular text-3">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-2">
          Nothing listed in {geo.area.name} yet. <Link href={`/cities/${geo.city.slug}`} className="underline underline-offset-4">See all of {geo.city.name}</Link> or <Link href="/add-business" className="underline underline-offset-4">add a business</Link>.
        </p>
      )}
      {top.length ? (
        <section className="mt-12">
          <SectionHeader title={`Top rated in ${geo.area.name}`} as="h2" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {top.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

