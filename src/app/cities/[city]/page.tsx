import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard, BusinessCard } from "@/components/cards";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { getDb, schema } from "@/db";
import { categoryCounts, listBusinesses } from "@/db/queries/directory";
import { getCity } from "@/db/queries/geo";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const revalidate = 3600;
type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props) {
  const { city } = await params;
  const loc = await getCity(city);
  if (!loc) return {};
  return buildMetadata({
    title: `${loc.name} — businesses, services and local news`,
    description: `Everything Searchable knows about ${loc.name}: restaurants, doctors, solar installers, car dealers, schools and more, plus local news and guides.`,
    path: `/cities/${loc.slug}`,
  });
}

export default async function CityPage({ params }: Props) {
  const { city } = await params;
  const loc = await getCity(city);
  if (!loc) notFound();
  const db = await getDb();
  const [cats, top, news] = await Promise.all([
    categoryCounts(loc.id),
    listBusinesses({ cityId: loc.id, limit: 6 }),
    db
      .select({
        id: schema.articles.id,
        kind: schema.articles.kind,
        slug: schema.articles.slug,
        title: schema.articles.title,
        dek: schema.articles.dek,
        excerpt: schema.articles.excerpt,
        featuredImageUrl: schema.articles.featuredImageUrl,
        publishedAt: schema.articles.publishedAt,
        updatedAt: schema.articles.updatedAt,
        readingMinutes: schema.articles.readingMinutes,
        isFeatured: schema.articles.isFeatured,
        categorySlug: schema.categories.slug,
        categoryName: schema.categories.name,
      })
      .from(schema.articles)
      .leftJoin(schema.categories, eq(schema.articles.categoryId, schema.categories.id))
      .where(and(eq(schema.articles.locationId, loc.id), eq(schema.articles.status, "published")))
      .orderBy(desc(schema.articles.publishedAt))
      .limit(4),
  ]);
  const withCount = cats.filter((c) => c.count > 0);
  const crumbs = [{ name: "Cities", path: "/cities" }, { name: loc.name, path: `/cities/${loc.slug}` }];
  const subtitle = [loc.parent?.name, loc.population ? `${(loc.population / 1e6).toFixed(1)} million people` : null].filter(Boolean).join(" · ");

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" title={loc.name} description={loc.description ?? subtitle} />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">Find in {loc.name}</h2>
        {withCount.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {withCount.map((c) => (
              <li key={c.id}>
                <Link href={`/businesses/${c.slug}/${loc.slug}`} className="surface surface-hover flex items-center justify-between px-5 py-3.5">
                  <span className="flex items-center gap-2">
                    <span aria-hidden>{c.icon}</span>
                    {c.namePlural ?? c.name}
                  </span>
                  <span className="text-sm tabular text-3">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-2">
            No businesses listed in {loc.name} yet.{" "}
            <Link href="/add-business" className="text-brand-700 underline">
              Add the first one
            </Link>
            .
          </p>
        )}
      </section>

      {top.length ? (
        <section className="mt-12">
          <SectionHeader title={`Top rated in ${loc.name}`} as="h2" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {top.map((b) => (
              <BusinessCard key={b.id} business={b} />
            ))}
          </div>
        </section>
      ) : null}

      {news.length ? (
        <section className="mt-12">
          <SectionHeader title={`${loc.name} news & guides`} as="h2" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {news.map((a) => (
              <ArticleCard key={a.id} article={{ ...a, category: a.categorySlug && a.categoryName ? { slug: a.categorySlug, name: a.categoryName } : null, author: null }} />
            ))}
          </div>
        </section>
      ) : null}

      {loc.children.length ? (
        <section className="mt-12">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">Areas</h2>
          <ul className="flex flex-wrap gap-2">
            {loc.children.map((a) => (
              <li key={a.id} className="rounded-full bg-surface-2 px-4 py-2 text-sm font-medium text-2">
                {a.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
