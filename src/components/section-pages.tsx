import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleListing, ArticlePage } from "@/components/article-page";
import { ArticleCard } from "@/components/cards";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { countArticles, getArticle, getCategory, listArticles, listCategories, type ArticleKind } from "@/db/queries/content";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { fetchPress, groupBySource } from "@/lib/press";
import { timeAgo } from "@/lib/format";

const META: Record<"news" | "guide", { section: string; name: string; title: string; description: string }> = {
  news: { section: "news", name: "News", title: "Pakistan news — with the useful context", description: "What changed, what it means for you, and what to do next. Business, economy, technology, cars, property and more." },
  guide: { section: "guides", name: "Guides", title: "Guides — how things actually work in Pakistan", description: "Step-by-step guides for taxes, banking, cars, property, government processes and utilities. With fees, timelines and the mistakes to avoid." },
};

const PAGE_SIZE = 18;

/* ───────────── Section hub (/news, /guides) ───────────── */
export function sectionMetadata(kind: "news" | "guide", page = 1): Metadata {
  const m = META[kind];
  return buildMetadata({ title: page > 1 ? `${m.title} — page ${page}` : m.title, description: m.description, path: page > 1 ? `/${m.section}/page/${page}` : `/${m.section}` });
}

export async function SectionHub({ kind, page = 1 }: { kind: "news" | "guide"; page?: number }) {
  const m = META[kind];
  const [categories, items, total, pressItems] = await Promise.all([listCategories(kind), listArticles({ kind, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }), countArticles(kind), kind === "news" && page === 1 ? fetchPress({ limit: 40, perFeed: 8 }) : Promise.resolve([])]);
  if (page > 1 && !items.length) notFound();
  const press = groupBySource(pressItems, 6);
  const featured = page === 1 ? items.slice(0, 1) : [];
  const rest = page === 1 ? items.slice(1) : items;
  return (
    <div className="container-x py-8 sm:py-12">
      <SectionHeader as="h1" title={m.name} description={m.description} />
      <CategoryNav section={m.section} categories={categories} />
      {featured.length ? (
        <div className="mt-8 grid gap-x-10 gap-y-6 border-b border-line pb-6 lg:grid-cols-[1.6fr_1fr]">
          <ArticleCard article={featured[0]} variant="feature" />
          <div className="divide-y divide-[var(--border)] lg:border-l lg:border-line lg:pl-8">
            {rest.slice(0, 2).map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      ) : null}
      <div className="mt-8">
        <ArticleListing items={page === 1 ? rest.slice(2) : rest} emptyText={`No ${m.name.toLowerCase()} published yet.`} />
      </div>
      <Pagination base={`/${m.section}`} page={page} total={total} />
      {press.length ? (
        <section className="mt-12 border-t border-line pt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">From Pakistan’s press</h2>
            <p className="text-xs text-3">Headlines refresh every 15 minutes · links open at the publisher</p>
          </div>
          <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {press.map((g) => (
              <div key={g.sourceSlug}>
                <p className="rule pt-2 eyebrow">{g.source}</p>
                <ul className="mt-1 divide-y divide-[var(--border)]">
                  {g.items.map((it) => (
                    <li key={it.url} className="py-2">
                      <a href={it.url} target="_blank" rel="noopener" className="headline-link text-[15px] leading-snug">{it.title}</a>
                      <span className="block text-[11px] text-3">{timeAgo(new Date(it.publishedAt))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ───────────── Category (/news/[category]) ───────────── */
export async function categoryMetadata(kind: "news" | "guide", slug: string, page = 1): Promise<Metadata> {
  const cat = await getCategory(kind, slug);
  if (!cat) return {};
  const m = META[kind];
  const base = `/${m.section}/${cat.slug}`;
  return buildMetadata({ title: `${cat.name} ${m.name.toLowerCase()}${page > 1 ? ` — page ${page}` : ""}`, description: cat.description ?? `${cat.name} — ${m.description}`, path: page > 1 ? `${base}/page/${page}` : base });
}

export async function CategoryPage({ kind, slug, page = 1 }: { kind: "news" | "guide"; slug: string; page?: number }) {
  const m = META[kind];
  const cat = await getCategory(kind, slug);
  if (!cat) notFound();
  const [categories, items, total] = await Promise.all([listCategories(kind), listArticles({ kind, categorySlug: slug, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }), countArticles(kind, slug)]);
  if (page > 1 && !items.length) notFound();
  const crumbs = [{ name: m.name, path: `/${m.section}` }, { name: cat.name, path: `/${m.section}/${cat.slug}` }];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" title={cat.name} description={cat.description ?? undefined} />
      <CategoryNav section={m.section} categories={categories} active={slug} />
      <div className="mt-8">
        <ArticleListing items={items} emptyText={`Nothing in ${cat.name} yet — check back soon.`} />
      </div>
      <Pagination base={`/${m.section}/${cat.slug}`} page={page} total={total} />
    </div>
  );
}

/* ───────────── Article (/news/[category]/[slug]) ───────────── */
export async function articleMetadata(kind: "news" | "guide", category: string, slug: string): Promise<Metadata> {
  const a = await getArticle(kind, slug);
  if (!a) return {};
  const m = META[kind];
  return buildMetadata({
    title: a.seoTitle ?? a.title,
    description: a.seoDescription ?? a.dek ?? a.excerpt,
    path: `/${m.section}/${a.category?.slug ?? category}/${a.slug}`,
    image: a.featuredImageUrl,
    type: "article",
    publishedTime: a.publishedAt,
    modifiedTime: a.updatedAt,
    noindex: a.noindex,
    kicker: a.category?.name ?? m.name,
  });
}

export async function ArticleRoute({ kind, slug }: { kind: "news" | "guide"; category: string; slug: string }) {
  const a = await getArticle(kind, slug);
  if (!a) notFound();
  return <ArticlePage article={a} kind={kind} />;
}

/* ───────────── Shared bits ───────────── */
function CategoryNav({ section, categories, active }: { section: string; categories: { slug: string; name: string }[]; active?: string }) {
  return (
    <nav className="-mx-5 overflow-x-auto border-y border-line px-5 sm:mx-0 sm:px-0" aria-label="Categories">
      <ul className="flex gap-1 py-1.5">
        <li>
          <Link href={`/${section}`} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-sm transition-colors", !active ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2 hover:text-[var(--text)]")}>
            All
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/${section}/${c.slug}`} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-sm transition-colors", active === c.slug ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2 hover:text-[var(--text)]")}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Pagination({ base, page, total, pageSize = PAGE_SIZE, hrefFor, labels = ["← Newer", "Older →"] }: { base: string; page: number; total: number; pageSize?: number; hrefFor?: (page: number) => string; labels?: [string, string] }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = hrefFor ?? ((n: number) => (n === 1 ? base : `${base}/page/${n}`));
  return (
    <nav className="mt-10 flex items-center justify-between text-sm" aria-label="Pagination">
      {page > 1 ? <Link href={href(page - 1)} className="font-medium text-brand-700 dark:text-brand-300">{labels[0]}</Link> : <span />}
      <span className="text-3">Page {page} of {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className="font-medium text-brand-700 dark:text-brand-300">{labels[1]}</Link> : <span />}
    </nav>
  );
}

export function pageParam(v: string | undefined) {
  return Math.max(1, parseInt(v ?? "1", 10) || 1);
}

export type { ArticleKind };
