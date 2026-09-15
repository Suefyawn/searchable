import Link from "next/link";
import { ArticleCard, ToolCard, articleUrl } from "@/components/cards";
import { Change } from "@/components/data/change";
import { SearchBox } from "@/components/layout/search-box";
import { NewsletterForm } from "@/components/newsletter-form";
import { listArticles } from "@/db/queries/content";
import { listSeriesWithLatest } from "@/db/queries/data";
import { categoryCounts } from "@/db/queries/directory";
import { citiesWithCounts } from "@/db/queries/geo";
import { formatDate, number } from "@/lib/format";
import { popularSearches } from "@/lib/search";
import { TOOLS } from "@/tools/registry";

export const revalidate = 300;

const EXAMPLES = ["PTA tax on iPhone 17", "income tax on 250,000 salary", "solar companies in Lahore", "how to become a filer", "electricity bill for 350 units"];

function Label({ children }: { children: React.ReactNode }) {
  return <p className="rule pt-2 eyebrow">{children}</p>;
}

export default async function HomePage() {
  const [featured, latest, guides, cities, categories, popular, series] = await Promise.all([
    listArticles({ kind: "news", featured: true, limit: 1 }),
    listArticles({ kind: "news", limit: 9 }),
    listArticles({ kind: "guide", limit: 5 }),
    citiesWithCounts(12),
    categoryCounts(),
    popularSearches(6),
    listSeriesWithLatest(),
  ]);
  const lead = featured[0] ?? latest[0];
  const others = latest.filter((a) => a.id !== lead?.id);
  const secondary = others.slice(0, 2);
  const headlines = others.slice(2, 8);
  const featuredTools = TOOLS.filter((t) => t.featured).slice(0, 6);
  const topCategories = categories.filter((c) => c.count > 0).slice(0, 10);
  const numbers = series.filter((s) => s.latest);

  return (
    <div className="container-x">
      {/* Search bar — the product, but quiet */}
      <section className="py-7 sm:py-9">
        <div className="mx-auto max-w-3xl">
          <SearchBox size="lg" placeholder="What do you want to know?" />
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-3">
            <span>Popular:</span>
            {(popular.length >= 4 ? popular.map((p) => p.query) : EXAMPLES).map((q) => (
              <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="underline-offset-4 hover:text-[var(--text)] hover:underline">
                {q}
              </Link>
            ))}
          </p>
        </div>
      </section>

      {/* Numbers today */}
      {numbers.length ? (
        <section className="rule grid grid-cols-2 divide-x divide-[var(--border)] border-b border-line sm:grid-cols-3 lg:grid-cols-5">
          {numbers.slice(0, 5).map((s) => (
            <Link key={s.id} href={`/data/${s.slug}`} className="group px-3 py-3.5 first:pl-0 hover:bg-surface-2">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-3">{s.name}</p>
              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <span className="font-serif text-2xl tabular">{s.unit === "%" ? `${number(s.latest!.value, 2)}%` : number(s.latest!.value, Number.isInteger(s.latest!.value) ? 0 : 2)}</span>
                <Change latest={s.latest!.value} previous={s.previous?.value ?? null} unit={s.unit} />
              </p>
              <p className="text-[11px] text-3">{formatDate(s.latest!.date, { day: "numeric", month: "short" })}</p>
            </Link>
          ))}
        </section>
      ) : null}

      {/* Front page */}
      {lead ? (
        <section className="grid gap-x-10 gap-y-8 py-10 lg:grid-cols-[1.7fr_1fr]">
          <div>
            <ArticleCard article={lead} variant="feature" />
            {secondary.length ? (
              <div className="mt-8 grid gap-x-8 border-t border-line sm:grid-cols-2 sm:divide-x sm:divide-[var(--border)]">
                {secondary.map((a) => (
                  <ArticleCard key={a.id} article={a} className="sm:[&:nth-child(2)]:pl-8" />
                ))}
              </div>
            ) : null}
          </div>
          <aside className="lg:border-l lg:border-line lg:pl-8">
            <Label>Latest</Label>
            <div className="divide-y divide-[var(--border)]">
              {headlines.map((a) => (
                <ArticleCard key={a.id} article={a} variant="compact" />
              ))}
            </div>
            <Link href="/news" className="mt-3 inline-block text-sm font-medium text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
              All news →
            </Link>
          </aside>
        </section>
      ) : null}

      {/* Calculators */}
      <section className="py-8">
        <div className="rule flex items-baseline justify-between pt-3">
          <h2 className="font-serif text-2xl">Calculators</h2>
          <Link href="/tools" className="text-sm font-medium text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
            All {TOOLS.length} tools →
          </Link>
        </div>
        <p className="mt-1 text-[15px] text-2">Real numbers, sourced and dated. Nothing you enter is stored.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredTools.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
      </section>

      {/* Guides + Directory */}
      <section className="grid gap-x-10 gap-y-10 py-8 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="rule flex items-baseline justify-between pt-3">
            <h2 className="font-serif text-2xl">Guides</h2>
            <Link href="/guides" className="text-sm font-medium text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
              All guides →
            </Link>
          </div>
          <div className="mt-2 divide-y divide-[var(--border)]">
            {guides.map((g) => (
              <article key={g.id} className="grid gap-x-6 py-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="eyebrow">{g.category?.name ?? "Guide"}</p>
                  <h3 className="mt-1 font-serif text-xl font-medium leading-snug">
                    <Link href={articleUrl(g)} className="headline-link">
                      {g.title}
                    </Link>
                  </h3>
                  {g.dek ? <p className="mt-1.5 text-[15px] text-2 line-clamp-2">{g.dek}</p> : null}
                </div>
                <p className="text-xs text-3 sm:pt-6">{g.readingMinutes ?? 3} min</p>
              </article>
            ))}
          </div>
        </div>
        <aside className="lg:border-l lg:border-line lg:pl-8">
          <Label>Find a business</Label>
          <ul className="mt-1 divide-y divide-[var(--border)]">
            {topCategories.map((c) => (
              <li key={c.id}>
                <Link href={`/businesses/${c.slug}`} className="flex items-center justify-between py-2 text-[15px] hover:text-brand-700 dark:hover:text-brand-300">
                  <span>{c.namePlural ?? c.name}</span>
                  <span className="text-xs tabular text-3">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 rule pt-2 eyebrow">Cities</p>
          <p className="mt-2 text-[15px] leading-relaxed">
            {cities.map((c, i) => (
              <span key={c.id}>
                <Link href={`/cities/${c.slug}`} className="underline-offset-4 hover:underline">
                  {c.name}
                </Link>
                {i < cities.length - 1 ? <span className="text-ink-300"> · </span> : null}
              </span>
            ))}
          </p>
          <Link href="/add-business" className="mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline">
            Add your business →
          </Link>
        </aside>
      </section>

      {/* Newsletter */}
      <section className="rule mb-4 mt-4 grid gap-8 py-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Searchable Daily</p>
          <h2 className="mt-2 font-serif text-3xl">The useful morning email about Pakistan</h2>
          <p className="mt-3 text-[15px] text-2">Top stories, what changed, one useful number, a tool of the day. Two minutes to read, every morning at 7.</p>
        </div>
        <NewsletterForm source="home" />
      </section>
    </div>
  );
}
