import Link from "next/link";
import { ArticleCard, ToolCard, articleUrl, toolExample } from "@/components/cards";
import { Change } from "@/components/data/change";
import { NewsletterForm } from "@/components/newsletter-form";
import { HeroCarousel, type Slide } from "@/components/home/hero-carousel";
import { Img } from "@/components/img";
import { LiveFeed } from "@/components/home/live-feed";
import { PhotoTile } from "@/components/photo-tiles";
import { activityFeed } from "@/lib/activity";
import { fetchPress, groupBySource, groupByTopic } from "@/lib/press";
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
  const [featured, latest, guides, cities, categories, series, feed, pressItems, worldItems] = await Promise.all([
    listArticles({ kind: "news", featured: true, limit: 1 }),
    listArticles({ kind: "news", limit: 12 }),
    listArticles({ kind: "guide", limit: 5 }),
    citiesWithCounts(8),
    categoryCounts(),
    listSeriesWithLatest(),
    activityFeed(24),
    fetchPress({ limit: 40, perFeed: 8, region: "pk" }),
    fetchPress({ limit: 120, perFeed: 8, region: "world" }),
  ]);
  const lead = featured[0] ?? latest[0];
  const ordered = lead ? [lead, ...latest.filter((a) => a.id !== lead.id)] : latest;
  const slides: Slide[] = ordered
    .filter((a) => a.featuredImageUrl)
    .slice(0, 5)
    .map((a) => ({ id: a.id, href: articleUrl(a), title: a.title, dek: a.dek, imageUrl: a.featuredImageUrl, label: a.category?.name ?? "News", meta: a.publishedAt ? timeAgo(a.publishedAt) : "" }));
  const slideIds = new Set(slides.map((s) => s.id));
  const headlines = ordered.filter((a) => !slideIds.has(a.id)).slice(0, 8);
  const press = groupBySource(pressItems, 5).slice(0, 4);
  const world = groupByTopic(worldItems, [
    { label: "World & US", topics: ["world", "us"] },
    { label: "Markets & crypto", topics: ["markets", "crypto", "business"] },
    { label: "Sport", topics: ["cricket", "mma", "snooker"] },
    { label: "Tech & entertainment", topics: ["tech", "entertainment"] },
  ]);
  const featuredTools = TOOLS.filter((t) => t.featured).slice(0, 6);
  const topCategories = categories.filter((c) => c.count > 0).slice(0, 10);
  const numbers = series.filter((s) => s.latest);

  return (
    <div className="container-x">
      {/* Numbers ticker, thin, scrollable, above the fold */}
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

      {/* Hero: carousel of the top stories + the live feed */}
      {slides.length ? (
        <section className="grid gap-8 py-8 lg:grid-cols-12 lg:gap-10 lg:py-10">
          <div className="lg:col-span-8">
            <HeroCarousel slides={slides} />
          </div>
          <div className="relative lg:col-span-4 lg:min-h-0">
            <LiveFeed initial={feed} className="max-h-[520px] overflow-hidden lg:absolute lg:inset-0 lg:max-h-none" />
          </div>
        </section>
      ) : null}

      {/* From the press */}
      {press.length ? (
        <section className="border-t border-line py-8">
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
                      <a href={it.url} target="_blank" rel="noopener" className="headline-link text-[15px] leading-snug">
                        {it.title}
                      </a>
                      <span className="block text-[11px] text-3">{timeAgo(new Date(it.publishedAt))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {world.length ? (
        <section className="border-t border-line py-8">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-2xl">Around the world</h2>
            <p className="text-xs text-3">World, US, markets, crypto, cricket, MMA, snooker, tech and entertainment, refreshed every 15 minutes</p>
          </div>
          <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {world.map((g) => (
              <div key={g.label}>
                <p className="rule pt-2 eyebrow">{g.label}</p>
                <ul className="mt-1 divide-y divide-[var(--border)]">
                  {g.items.map((it) => (
                    <li key={it.url} className="py-2">
                      <a href={it.url} target="_blank" rel="noopener" className="headline-link text-[15px] leading-snug">
                        {it.title}
                      </a>
                      <span className="block text-[11px] text-3">{timeAgo(new Date(it.publishedAt))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
