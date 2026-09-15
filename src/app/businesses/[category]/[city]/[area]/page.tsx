import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCard } from "@/components/cards";
import { Breadcrumbs, EmptyState, JsonLd, SectionHeader } from "@/components/ui";
import { areaCounts, countBusinesses, getBusinessCategory, listBusinesses } from "@/db/queries/directory";
import { getArea } from "@/db/queries/geo";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const revalidate = 3600;
type Props = { params: Promise<{ category: string; city: string; area: string }> };

/** Category × area, e.g. /businesses/restaurants/lahore/gulberg. Indexable only with ≥ 5 listings. */
export async function generateMetadata({ params }: Props) {
  const { category, city, area } = await params;
  const [cat, geo] = await Promise.all([getBusinessCategory(category), getArea(city, area)]);
  if (!cat || !geo) return {};
  const n = await countBusinesses({ categoryId: cat.id, areaId: geo.area.id });
  const plural = cat.namePlural ?? cat.name;
  return buildMetadata({
    title: `${plural} in ${geo.area.name}, ${geo.city.name}${n ? ` — ${n} listed` : ""}`,
    description: `${plural} in ${geo.area.name}, ${geo.city.name}: phone, WhatsApp, hours, address and reviews. Verified listings first.`,
    path: `/businesses/${cat.slug}/${geo.city.slug}/${geo.area.slug}`,
    noindex: n < 5,
  });
}

export default async function CategoryAreaPage({ params }: Props) {
  const { category, city, area } = await params;
  const [cat, geo] = await Promise.all([getBusinessCategory(category), getArea(city, area)]);
  if (!cat || !geo) notFound();
  const [items, areas] = await Promise.all([listBusinesses({ categoryId: cat.id, areaId: geo.area.id, limit: 48 }), areaCounts(geo.city.id, cat.id)]);
  const plural = cat.namePlural ?? cat.name;
  const crumbs = [
    { name: "Businesses", path: "/businesses" },
    { name: plural, path: `/businesses/${cat.slug}` },
    { name: geo.city.name, path: `/businesses/${cat.slug}/${geo.city.slug}` },
    { name: geo.area.name, path: `/businesses/${cat.slug}/${geo.city.slug}/${geo.area.slug}` },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" title={`${plural} in ${geo.area.name}, ${geo.city.name}`} description={items.length ? `${items.length} listed in ${geo.area.name}. Verified businesses first, then by rating.` : undefined} />
      {areas.length > 1 ? (
        <nav className="-mx-5 mb-6 overflow-x-auto border-y border-line px-5 sm:mx-0 sm:px-0" aria-label="Areas">
          <ul className="flex gap-1 py-1.5 text-sm">
            <li><Link href={`/businesses/${cat.slug}/${geo.city.slug}`} className="whitespace-nowrap px-2.5 py-1.5 text-2 hover:bg-surface-2">All {geo.city.name}</Link></li>
            {areas.map((a) => (
              <li key={a.id}>
                <Link href={`/businesses/${cat.slug}/${geo.city.slug}/${a.slug}`} className={`whitespace-nowrap px-2.5 py-1.5 ${a.id === geo.area.id ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2"}`}>
                  {a.name} <span className="tabular opacity-70">{a.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
        </div>
      ) : (
        <EmptyState title={`No ${plural.toLowerCase()} listed in ${geo.area.name} yet`} description={`See all ${plural.toLowerCase()} in ${geo.city.name}, or add one.`} action={<Link href={`/businesses/${cat.slug}/${geo.city.slug}`} className="text-sm font-medium text-brand-700">All of {geo.city.name} →</Link>} />
      )}
    </div>
  );
}
