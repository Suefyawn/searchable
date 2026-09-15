import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolCard } from "@/components/cards";
import { Badge, Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { entityHub, getEntity } from "@/db/queries/entities";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { getTool } from "@/tools/registry";

export const revalidate = 1800;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const e = await getEntity(slug);
  if (!e) return {};
  return buildMetadata({ title: `${e.name} — news, tools and guides`, description: e.description ?? `Everything Searchable knows about ${e.name}.`, path: `/e/${e.slug}` });
}

export default async function EntityPage({ params }: Props) {
  const { slug } = await params;
  const e = await getEntity(slug);
  if (!e) notFound();
  const hub = await entityHub(e.id);
  const crumbs = [{ name: "Topics", path: "/search" }, { name: e.name, path: `/e/${e.slug}` }];
  const facts = Object.entries(e.facts);
  const empty = !hub.tools.length && !hub.articles.length && !hub.businesses.length;

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <header className="max-w-3xl">
        <Badge tone="brand" className="capitalize">
          {e.kind}
        </Badge>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          {e.name}
          {e.nameUrdu ? <span className="ml-3 text-2xl font-normal text-3">{e.nameUrdu}</span> : null}
        </h1>
        {e.description ? <p className="mt-3 text-lg text-2 leading-relaxed">{e.description}</p> : null}
        {e.aliases.length ? <p className="mt-2 text-sm text-3">Also: {e.aliases.join(", ")}</p> : null}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-12">
          {hub.tools.length ? (
            <section>
              <SectionHeader title="Tools" as="h2" />
              <div className="grid gap-4 sm:grid-cols-2">
                {hub.tools.map((t) => {
                  const def = getTool(t.slug);
                  return def ? <ToolCard key={t.slug} tool={def} /> : null;
                })}
              </div>
            </section>
          ) : null}

          {hub.articles.length ? (
            <section>
              <SectionHeader title="News & guides" as="h2" />
              <ul className="surface divide-y divide-[var(--border)] px-5">
                {hub.articles.map((a) => (
                  <li key={a.slug} className="py-3.5">
                    <Link href={`/${a.kind === "news" ? "news" : "guides"}/${a.categorySlug ?? "general"}/${a.slug}`} className="group block">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">{a.kind === "news" ? "News" : "Guide"}</p>
                      <p className="mt-0.5 font-medium group-hover:text-brand-800 dark:group-hover:text-brand-200">{a.title}</p>
                      {a.dek ? <p className="mt-1 text-[15px] text-2 line-clamp-2">{a.dek}</p> : null}
                      {a.publishedAt ? <p className="mt-1 text-xs text-3">{formatDate(a.publishedAt)}</p> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {hub.businesses.length ? (
            <section>
              <SectionHeader title="Businesses" as="h2" />
              <ul className="surface divide-y divide-[var(--border)] px-5">
                {hub.businesses.map((b) => (
                  <li key={b.slug} className="py-3">
                    <Link href={`/b/${b.slug}`} className="flex items-center justify-between gap-4 hover:text-brand-800 dark:hover:text-brand-200">
                      <span className="font-medium">{b.name}</span>
                      <span className="text-sm text-3">{[b.categoryName, b.cityName].filter(Boolean).join(" · ")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {empty ? <p className="text-2">Nothing linked to {e.name} yet.</p> : null}
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          {facts.length || e.website ? (
            <div className="surface p-5 text-[15px]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-3">Facts</p>
              <dl className="space-y-1.5">
                {facts.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-2">{k}</dt>
                    <dd className="text-right">{v}</dd>
                  </div>
                ))}
                {e.website ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-2">Website</dt>
                    <dd className="truncate text-right">
                      <a href={e.website} target="_blank" rel="noopener" className="text-brand-700 hover:underline dark:text-brand-300">
                        {e.website.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
          <div className="surface p-5 text-[15px]">
            <p className="font-semibold">Search {e.name}</p>
            <Link href={`/search?q=${encodeURIComponent(e.name)}`} className="mt-1 inline-block text-brand-700 hover:underline dark:text-brand-300">
              Everything mentioning {e.name} →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
