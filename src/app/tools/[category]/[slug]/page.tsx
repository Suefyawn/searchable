import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { ArticleCard, ToolCard } from "@/components/cards";
import { ToolRunner } from "@/components/tools/tool-runner";
import { Badge, Breadcrumbs, JsonLd } from "@/components/ui";
import { getArticlesBySlugs } from "@/db/queries/content";
import { getEntitiesBySlugs } from "@/db/queries/entities";
import { formatDate } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd, toolJsonLd } from "@/lib/seo";
import { TOOLS, getTool, toolUrl } from "@/tools/registry";
import { TOOL_CATEGORIES } from "@/tools/types";
import { liveDefaults } from "@/tools/live-defaults";

type Props = { params: Promise<{ category: string; slug: string }> };

export const revalidate = 600;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ category: t.category, slug: t.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  return buildMetadata({ title: tool.seoTitle ?? tool.name, description: tool.description, path: toolUrl(tool), kicker: `${TOOL_CATEGORIES[tool.category].name} calculator` });
}

export default async function ToolPage({ params }: Props) {
  const { category, slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();
  if (tool.category !== category) permanentRedirect(toolUrl(tool));

  const path = toolUrl(tool);
  const cat = TOOL_CATEGORIES[tool.category];
  const [guides, entities, live] = await Promise.all([getArticlesBySlugs("guide", tool.related?.guides ?? []), getEntitiesBySlugs(tool.related?.entities ?? []), liveDefaults(tool.slug)]);
  const relatedTools = (tool.related?.tools ?? []).map(getTool).filter((t): t is NonNullable<typeof t> => !!t);
  const crumbs = [{ name: "Tools", path: "/tools" }, { name: cat.name, path: `/tools/${tool.category}` }, { name: tool.shortName ?? tool.name, path }];

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[toolJsonLd({ name: tool.name, description: tool.description, path }), faqJsonLd(tool.faqs), breadcrumbJsonLd(crumbs)]} />
      <Breadcrumbs items={crumbs.slice(0, -1)} />

      <header className="mt-6 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/tools/${tool.category}`}>
            <Badge tone="brand">{cat.name}</Badge>
          </Link>
          <Badge>v{tool.version}</Badge>
          <span className="text-sm text-3">Last reviewed {formatDate(tool.lastReviewed)}</span>
        </div>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{tool.name}</h1>
        <p className="mt-3 text-lg text-2 leading-relaxed">{tool.description}</p>
      </header>

      <div className="mt-8">
        <Suspense fallback={<div className="surface p-6 text-2">Loading calculator…</div>}>
          <ToolRunner slug={tool.slug} live={live.input} />
        </Suspense>
        {live.sources.length ? (
          <p className="mt-3 text-[13px] text-3">
            Pre-filled from Searchable Data:{" "}
            {live.sources.map((s, i) => (
              <span key={s.key}>
                {i ? " · " : ""}
                <Link href={`/data/${s.seriesSlug}`} className="underline underline-offset-4">{s.label}</Link> {s.value.toLocaleString()} ({formatDate(s.date, { day: "numeric", month: "short" })})
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-12">
          <section>
            <h2 className="font-display text-3xl font-semibold">How this is calculated</h2>
            <div className="prose prose-searchable mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(tool.methodology) }} />
          </section>

          {tool.faqs.length ? (
            <section className="max-w-[68ch]">
              <h2 className="font-display text-3xl font-semibold">Frequently asked questions</h2>
              <dl className="mt-5 divide-y divide-[var(--border)] surface px-6">
                {tool.faqs.map((f) => (
                  <div key={f.question} className="py-4">
                    <dt className="font-medium">{f.question}</dt>
                    <dd className="mt-1.5 text-[15px] text-2 leading-relaxed">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="max-w-[68ch] text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-3">Sources</h2>
            <ul className="mt-2 space-y-1 text-2">
              {tool.sources.map((s, i) => (
                <li key={i}>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener" className="underline decoration-brand-300 hover:decoration-brand-700">{s.title}</a>
                  ) : (
                    s.title
                  )}
                  {s.publisher ? <span className="text-3"> — {s.publisher}</span> : null}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-3">
              Version {tool.version} · reviewed {formatDate(tool.lastReviewed)}. Rates change with the Federal Budget and regulator notifications; we update this tool when they do. Confirm with the primary source before making financial decisions.
            </p>
          </section>

          {entities.length ? (
            <section className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-3">Topics:</span>
              {entities.map((e) => (
                <Link key={e.id} href={`/e/${e.slug}`} className="border border-line px-2.5 py-1 text-2 hover:bg-surface-2 hover:text-[var(--text)]">
                  {e.name}
                </Link>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="space-y-6 self-start lg:sticky lg:top-24">
          {relatedTools.length ? (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">Related tools</p>
              <div className="space-y-3">
                {relatedTools.map((t) => (
                  <ToolCard key={t.slug} tool={t} />
                ))}
              </div>
            </div>
          ) : null}
          {guides.length ? (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">Related guides</p>
              <div className="space-y-3">
                {guides.map((g) => (
                  <ArticleCard key={g.id} article={g} />
                ))}
              </div>
            </div>
          ) : null}
          {tool.related?.businessCategories?.length ? (
            <div className="surface p-5">
              <p className="font-semibold">Find a professional</p>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {tool.related.businessCategories.map((c) => (
                  <li key={c}>
                    <Link href={`/businesses/${c}`} className="text-brand-700 dark:text-brand-300 hover:underline">
                      {c.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
