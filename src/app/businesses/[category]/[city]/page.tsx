import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCard } from "@/components/cards";
import { Pagination } from "@/components/section-pages";
import { Breadcrumbs, EmptyState, JsonLd, SectionHeader } from "@/components/ui";
import { areaCounts, categoryCounts, countBusinesses, getBusinessCategory, listBusinesses } from "@/db/queries/directory";
import { getCity } from "@/db/queries/geo";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const revalidate = 3600;
const PAGE_SIZE = 24;
type Props = { params: Promise<{ category: string; city: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props) {
  const { category, city } = await params;
  const [cat, loc] = await Promise.all([getBusinessCategory(category), getCity(city)]);
  if (!cat || !loc) return {};
  const n = await countBusinesses({ categoryId: cat.id, cityId: loc.id });
  const plural = cat.namePlural ?? cat.name;
  return buildMetadata({
    title: `${n ? `${n} best ` : ""}${plural} in ${loc.name}`,
    description: `${plural} in ${loc.name} with phone numbers, WhatsApp, opening hours, addresses and reviews. Verified listings first.`,
    path: `/businesses/${cat.slug}/${loc.slug}`,
    noindex: n < 5, // thin-page gate
  });
}

export default async function CategoryCityPage({ params, searchParams }: Props) {
  const [{ category, city }, { page: pageRaw }] = await Promise.all([params, searchParams]);
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
  const [cat, loc] = await Promise.all([getBusinessCategory(category), getCity(city)]);
  if (!cat || !loc) notFound();
  const [items, total, otherCats, areas] = await Promise.all([
    listBusinesses({ categoryId: cat.id, cityId: loc.id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countBusinesses({ categoryId: cat.id, cityId: loc.id }),
    categoryCounts(loc.id),
    areaCounts(loc.id, cat.id),
  ]);
  const plural = cat.namePlural ?? cat.name;
  const crumbs = [
    { name: "Businesses", path: "/businesses" },
    { name: plural, path: `/businesses/${cat.slug}` },
    { name: loc.name, path: `/businesses/${cat.slug}/${loc.slug}` },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" title={`${plural} in ${loc.name}`} description={total ? `${total} listed. Verified businesses appear first, then by rating.` : undefined} />
      {areas.length ? (
        <nav className="-mx-5 mb-6 overflow-x-auto border-y border-line px-5 sm:mx-0 sm:px-0" aria-label="Areas">
          <ul className="flex gap-1 py-1.5 text-sm">
            <li><span className="whitespace-nowrap bg-ink-900 px-2.5 py-1.5 text-white dark:bg-white dark:text-ink-900">All {loc.name}</span></li>
            {areas.map((a) => (
              <li key={a.id}>
                <Link href={`/businesses/${cat.slug}/${loc.slug}/${a.slug}`} className="whitespace-nowrap px-2.5 py-1.5 text-2 hover:bg-surface-2">
                  {a.name} <span className="tabular opacity-70">{a.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          {items.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          ) : (
            <EmptyState title={`No ${plural.toLowerCase()} listed in ${loc.name} yet`} description="Know one? Add it in a minute — it is free." action={<Link href="/add-business" className="text-sm font-medium text-brand-700">Add a business →</Link>} />
          )}
          <Pagination base={`/businesses/${cat.slug}/${loc.slug}`} page={page} total={total} pageSize={PAGE_SIZE} hrefFor={(n) => (n === 1 ? `/businesses/${cat.slug}/${loc.slug}` : `/businesses/${cat.slug}/${loc.slug}?page=${n}`)} labels={["← Previous", "Next →"]} />
        </div>
        <aside className="space-y-6 self-start lg:sticky lg:top-24">
          <div className="surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-3">More in {loc.name}</p>
            <ul className="mt-2 space-y-1 text-[15px]">
              {otherCats
                .filter((c) => c.count > 0 && c.slug !== cat.slug)
                .slice(0, 10)
                .map((c) => (
                  <li key={c.id}>
                    <Link href={`/businesses/${c.slug}/${loc.slug}`} className="flex justify-between rounded px-1 py-0.5 hover:text-brand-700 dark:hover:text-brand-300">
                      <span>{c.namePlural ?? c.name}</span>
                      <span className="tabular text-3">{c.count}</span>
                    </Link>
                  </li>
                ))}
            </ul>
            <Link href={`/cities/${loc.slug}`} className="mt-3 inline-block text-sm font-medium text-brand-700 dark:text-brand-300">
              All of {loc.name} →
            </Link>
          </div>
          <div className="border border-line bg-surface-2 p-5">
            <p className="font-semibold">Is your business missing?</p>
            <p className="mt-1 text-[15px] text-2">Add it free and get found by people searching for {plural.toLowerCase()} in {loc.name}.</p>
            <Link href="/add-business" className="mt-3 inline-flex h-9 items-center bg-ink-900 px-3.5 text-sm font-medium text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900">
              Add your business
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
