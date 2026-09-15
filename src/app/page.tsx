import Link from "next/link";
import { ArticleCard, ToolCard, articleUrl, toolExample } from "@/components/cards";
import { Change } from "@/components/data/change";
import { Img } from "@/components/img";
import { NewsletterForm } from "@/components/newsletter-form";
import { PhotoTile } from "@/components/photo-tiles";
import { listArticles } from "@/db/queries/content";
import { listSeriesWithLatest } from "@/db/queries/data";
import { categoryCounts } from "@/db/queries/directory";
import { citiesWithCounts } from "@/db/queries/geo";
import { number, timeAgo } from "@/lib/format";
import { TOOLS } from "@/tools/registry";

export const revalidate = 300;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="rule pt-2 eyebrow">{children}</p>;
}

export default async function HomePage() {
  const [featured, latest, guides, cities, categories, series] = await Promise.all([
    listArticles({ kind: "news", featured: true, limit: 1 }),
    listArticles({ kind: "news", limit: 10 }),
    listArticles({ kind: "guide", limit: 5 }),
    citiesWithCounts(8),
    categoryCounts(),
    listSeriesWithLatest(),
  ]);
  const lead = featured[0] ?? latest[0];
  const others = latest.filter((a) => a.id !== lead?.id);
  const secondary = others.slice(0, 3);
  const headlines = others.slice(3, 11);
  const featuredTools = TOOLS.filter((t) => t.featured).slice(0, 6);
  const topCategories = categories.filter((c) => c.count > 0).slice(0, 10);
  const numbers = series.filter((s) => s.latest);

  return (
    <div className="container-x">
      {/* Numbers ticker — thin, scrollable, above the fold */}
      {numbers.length ? (
        <section className="no-scrollbar -mx-5 overflow-x-auto border-b border-line px-5 sm:mx-0 sm:px-0" aria-label="Today's numbers">
          <div className="flex min-w-max divide-x divide-[var(--border)]">
            {numbers.slice(0, 7).map((s) => (
              <Link key={s.id} href={`/data/${s.slug}`} className="flex items-baseline gap-2 px-4 py-2.5 first:pl-0 text-[13px] hover:bg-surface-2">
                <span className="text-3">{s.name.replace(/ in Pakistan.*$/i, "").replace(/ today$/i, "").replace(/ \(.*\)$/, "")}</span>
                <span className="font-medium tabular">{s.unit === "%" ? `${number(s.latest!.value, 2)}%` : number(s.latest!.value, Number.isInteger(s.latest!.value) ? 0 : 2)}</span>
                <Change latest={s.latest!.value} previous={s.previous?.value ?? null} unit={s.unit} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Hero: the lead story */}
      {lead ? (
        <section className="grid gap-8 py-8 lg:grid-cols-12 lg:gap-12 lg:py-12">
          <Link href={articleUrl(lead)} className="block lg:col-span-7" aria-hidden tabIndex={-1}>
            {lead.featuredImageUrl ? <Img src={lead.featuredImageUrl} alt="" aspect="3/2" priority sizes="(min-width: 1024px) 720px, 100vw" /> : <div className="bg-surface-2" style={{ aspectRatio: "3/2" }} />}
          </Link>
          <div className="flex flex-col justify-center lg:col-span-5">
            <p className="eyebrow">
              {lead.category?.name ?? "News"}
              {lead.publishedAt ? <span className="ml-2 font-sans text-[11px] font-normal normal-case tracking-normal text-3">{timeAgo(lead.publishedAt)}</span> : null}
            </p>
            <h1 className="mt-3 font-serif text-[2.4rem] font-medium leading-[1.05] tracking-tight sm:text-[3rem] lg:text-[3.4rem]">
              <Link href={articleUrl(lead)} className="headline-link">
                {lead.title}
              </Link>
            </h1>
            {lead.dek ? <p className="mt-5 max-w-xl font-serif text-[1.15rem] leading-relaxed text-2">{lead.dek}</p> : null}
            <p className="mt-5 text-[13px] text-3">
              {lead.author?.name ? `${lead.author.name} · ` : ""}
              {lead.readingMinutes ?? 3} min read
            </p>
            {secondary.length ? (
              <ol className="mt-8 divide-y divide-[var(--border)] border-t border-line">
                {secondary.map((a) => (
                  <li key={a.id} className="py-3">
                    <p className="eyebrow">{a.category?.name ?? "News"}</p>
                    <Link href={articleUrl(a)} className="headline-link mt-0.5 block font-serif text-[1.1rem] font-medium leading-snug">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Latest: photo grid */}
      {headlines.length ? (
        <section className="border-t border-line py-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">Latest</h2>
            <Link href="/news" className="text-sm font-medium text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
              All news →
            </Link>
          </div>
          <div className="mt-4 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {headlines.slice(0, 4).map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
          {headlines.length > 4 ? (
            <div className="mt-6 grid gap-x-8 border-t border-line sm:grid-cols-2">
              {headlines.slice(4, 8).map((a) => (
                <ArticleCard key={a.id} article={a} variant="compact" />
              ))}
            </div>
          ) : null}
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
            <ToolCard key={t.slug} tool={t} example={toolExample(t)} />
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
                <div className="flex gap-4">
                  {g.featuredImageUrl ? (
                    <Link href={articleUrl(g)} className="shrink-0" tabIndex={-1} aria-hidden>
                      <Img src={g.featuredImageUrl} alt="" aspect="1/1" className="size-20" sizes="80px" />
                    </Link>
                  ) : null}
                  <div>
                  <p className="eyebrow">{g.category?.name ?? "Guide"}</p>
                  <h3 className="mt-1 font-serif text-xl font-medium leading-snug">
                    <Link href={articleUrl(g)} className="headline-link">
                      {g.title}
                    </Link>
                  </h3>
                  {g.dek ? <p className="mt-1.5 text-[15px] text-2 line-clamp-2">{g.dek}</p> : null}
                  </div>
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
          <Link href="/add-business" className="mt-6 inline-block text-sm font-medium underline-offset-4 hover:underline">
            Add your business →
          </Link>
        </aside>
      </section>

      {/* Cities */}
      <section className="py-8">
        <div className="rule flex items-baseline justify-between pt-3">
          <h2 className="font-serif text-2xl">Cities</h2>
          <Link href="/cities" className="text-sm font-medium text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
            All cities →
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
          {cities.map((c) => (
            <PhotoTile key={c.id} href={`/cities/${c.slug}`} title={c.name} meta={c.count ? `${c.count} businesses` : undefined} imageUrl={c.imageUrl} />
          ))}
        </div>
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
