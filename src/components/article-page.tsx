import Link from "next/link";
import { ArticleCard, ToolCard, articleUrl } from "@/components/cards";
import { NewsletterForm } from "@/components/newsletter-form";
import { Badge, Breadcrumbs, JsonLd } from "@/components/ui";
import { getArticle, listArticles } from "@/db/queries/content";
import { entitiesForTarget } from "@/db/queries/entities";
import { formatDate } from "@/lib/format";
import { extractToc, renderMarkdown } from "@/lib/markdown";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo";
import { TOOLS } from "@/tools/registry";

type Article = NonNullable<Awaited<ReturnType<typeof getArticle>>>;

export async function ArticlePage({ article, kind }: { article: Article; kind: "news" | "guide" }) {
  const section = kind === "news" ? "news" : "guides";
  const sectionName = kind === "news" ? "News" : "Guides";
  const path = `/${section}/${article.category?.slug ?? "general"}/${article.slug}`;
  const html = renderMarkdown(article.body);
  const toc = kind === "guide" ? extractToc(article.body) : [];
  const [related, entities] = await Promise.all([
    listArticles({ kind, categorySlug: article.category?.slug, limit: 4, excludeId: article.id }),
    entitiesForTarget("article", article.id),
  ]);
  // Tools mentioned in the body (by URL) come first; otherwise tools sharing an entity.
  const linkedToolSlugs = [...article.body.matchAll(/\/tools\/[a-z]+\/([a-z0-9-]+)/g)].map((m) => m[1]);
  const entitySlugs = new Set(entities.map((e) => e.slug));
  const relatedTools = TOOLS.filter((t) => linkedToolSlugs.includes(t.slug) || t.related?.entities?.some((e) => entitySlugs.has(e))).slice(0, 3);

  const crumbs = [
    { name: sectionName, path: `/${section}` },
    ...(article.category ? [{ name: article.category.name, path: `/${section}/${article.category.slug}` }] : []),
    { name: article.title, path },
  ];

  return (
    <article className="container-x py-8 sm:py-12">
      <JsonLd
        data={[
          articleJsonLd({ kind: article.kind, title: article.title, description: article.dek ?? article.excerpt ?? "", path, image: article.featuredImageUrl, publishedAt: article.publishedAt, updatedAt: article.updatedAt, authorName: article.author?.name }),
          faqJsonLd(article.faqs),
          breadcrumbJsonLd(crumbs),
        ]}
      />
      <Breadcrumbs items={crumbs.slice(0, -1)} />

      <header className="mt-6 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          {article.category ? (
            <Link href={`/${section}/${article.category.slug}`}>
              <Badge tone="brand">{article.category.name}</Badge>
            </Link>
          ) : null}
          {article.location ? (
            <Link href={`/cities/${article.location.slug}`}>
              <Badge>{article.location.name}</Badge>
            </Link>
          ) : null}
        </div>
        <h1 className="mt-4 font-serif text-4xl font-medium leading-[1.1] sm:text-5xl lg:text-[3.25rem]">{article.title}</h1>
        {article.dek ? <p className="mt-4 font-serif text-xl leading-relaxed text-2 sm:text-[1.35rem]">{article.dek}</p> : null}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-line py-3 text-[13px] text-3">
          {article.author ? <span className="font-medium text-2">{article.author.name}</span> : null}
          {article.publishedAt ? <span>{kind === "news" ? "Published" : "Updated"} {formatDate(article.lastReviewedAt ?? article.publishedAt)}</span> : null}
          <span>{article.readingMinutes ?? 3} min read</span>
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {toc.length >= 3 ? (
            <nav aria-label="Contents" className="mb-8 surface-2 p-5 text-[15px] lg:hidden">
              <p className="font-semibold">In this guide</p>
              <ol className="mt-2 space-y-1.5">
                {toc.map((t) => (
                  <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                    <a href={`#${t.id}`} className="text-2 hover:text-[var(--text)]">{t.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="prose prose-searchable" dangerouslySetInnerHTML={{ __html: html }} />

          {article.faqs.length ? (
            <section className="mt-12 max-w-[68ch]">
              <h2 className="font-serif text-2xl">Frequently asked questions</h2>
              <dl className="mt-4 divide-y divide-[var(--border)] border-y border-line">
                {article.faqs.map((f) => (
                  <div key={f.question} className="py-4">
                    <dt className="font-medium">{f.question}</dt>
                    <dd className="mt-1.5 text-[15px] text-2 leading-relaxed">{f.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {article.sources.length ? (
            <section className="mt-10 max-w-[68ch] text-sm">
              <h2 className="font-semibold uppercase tracking-wider text-3 text-xs">Sources</h2>
              <ul className="mt-2 space-y-1 text-2">
                {article.sources.map((s, i) => (
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
            </section>
          ) : null}

          {entities.length ? (
            <section className="mt-8 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-3">Topics:</span>
              {entities.map((e) => (
                <Link key={e.id} href={`/e/${e.slug}`} className="border border-line px-2.5 py-1 text-2 hover:bg-surface-2 hover:text-[var(--text)]">
                  {e.name}
                </Link>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 self-start">
          {toc.length >= 3 ? (
            <nav aria-label="Contents" className="hidden lg:block border-t border-[var(--rule)] pt-3 text-[15px]">
              <p className="font-semibold">In this guide</p>
              <ol className="mt-2 space-y-1.5">
                {toc.map((t) => (
                  <li key={t.id} className={t.level === 3 ? "pl-4" : ""}>
                    <a href={`#${t.id}`} className="text-2 hover:text-[var(--text)]">{t.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
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
          <div className="border-t border-[var(--rule)] pt-3">
            <p className="eyebrow">Searchable Daily</p>
            <p className="mt-1 text-[15px] text-2">The useful morning email. Two minutes, every day.</p>
            <div className="mt-3">
              <NewsletterForm compact source={kind} />
            </div>
          </div>
        </aside>
      </div>

      {related.length ? (
        <section className="mt-16">
          <h2 className="rule mb-2 pt-3 font-serif text-2xl">More in {article.category?.name ?? sectionName}</h2>
          <div className="grid gap-x-8 sm:grid-cols-2 sm:divide-x sm:divide-[var(--border)] lg:grid-cols-4">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} className="sm:[&:not(:first-child)]:pl-8" />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

export function ArticleListing({ items, emptyText }: { items: Awaited<ReturnType<typeof listArticles>>; emptyText: string }) {
  if (!items.length) return <p className="text-2">{emptyText}</p>;
  return (
    <div className="grid gap-x-8 border-t border-line sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => (
        <ArticleCard key={a.id} article={a} className="border-b border-line" />
      ))}
    </div>
  );
}

export { articleUrl };
