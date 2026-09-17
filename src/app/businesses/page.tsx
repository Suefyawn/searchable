import Link from "next/link";
import { PhotoTile } from "@/components/photo-tiles";
import { JsonLd, SectionHeader } from "@/components/ui";
import { categoryCounts } from "@/db/queries/directory";
import { citiesWithCounts } from "@/db/queries/geo";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { HUB_COPY } from "@/lib/seo-copy";

export const revalidate = 3600;
export const metadata = buildMetadata({
  ...HUB_COPY.businesses,
  path: "/businesses",
});

export default async function BusinessesPage() {
  const [categories, cities] = await Promise.all([categoryCounts(), citiesWithCounts(20)]);
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd([{ name: "Businesses", path: "/businesses" }])} />
      <SectionHeader as="h1" title="Business directory" description="Browse by what you need, then narrow to your city. Verified listings show a badge and a last-checked date." />
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">Categories</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id}>
                <PhotoTile href={`/businesses/${c.slug}`} title={c.namePlural ?? c.name} meta={c.count ? `${c.count} listed` : "Be the first to list"} imageUrl={c.imageUrl} aspect="3/2" />
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">Cities</h2>
          <ul className="surface divide-y divide-[var(--border)]">
            {cities.map((c) => (
              <li key={c.id}>
                <Link href={`/cities/${c.slug}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-2">
                  <span>{c.name}</span>
                  <span className="text-sm tabular text-3">{c.count || ""}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 border border-line bg-surface-2 p-5">
            <p className="font-semibold">Own a business?</p>
            <p className="mt-1 text-[15px] text-2">Add it free, claim it, and keep your hours and contact details up to date.</p>
            <Link href="/add-business" className="mt-3 inline-flex h-10 items-center bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900">
              Add your business
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
