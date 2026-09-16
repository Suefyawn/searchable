import Link from "next/link";
import { ArticleCard, ToolCard, articleUrl, toolExample } from "@/components/cards";
import { Change } from "@/components/data/change";
import { NewsletterForm } from "@/components/newsletter-form";
import { HeroCarousel, type Slide } from "@/components/home/hero-carousel";
import { readFrontPage, resolveFront } from "@/lib/front-page";
import { readSiteSettings } from "@/lib/site-settings";
import { buildMetadata } from "@/lib/seo";
import { HUB_COPY } from "@/lib/seo-copy";
import { NumbersTicker } from "@/components/home/numbers-ticker";
import { Img } from "@/components/img";
import { LiveFeed } from "@/components/home/live-feed";
import { PhotoTile } from "@/components/photo-tiles";
import { PostCard } from "@/components/community/post-card";
import { ProCard } from "@/components/professionals/pro-card";
import { listPosts } from "@/lib/community";
import { listProfessionals } from "@/lib/professionals";
import { activityFeed } from "@/lib/activity";
import { listArticles, listArticlesByIds } from "@/db/queries/content";
import { listSeriesWithLatest } from "@/db/queries/data";
import { readMatches, tickerLine } from "@/lib/match-today";
import { categoryCounts } from "@/db/queries/directory";
import { citiesWithCounts } from "@/db/queries/geo";
import { number, timeAgo } from "@/lib/format";
import { TOOLS } from "@/tools/registry";

export const revalidate = 900;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="rule pt-2 eyebrow">{children}</p>;
}

// The home title stands alone (no "· Searchable" suffix: the name is already in it) and carries the canonical.
export const metadata = buildMetadata({ ...HUB_COPY.home, path: "", absoluteTitle: true });

export default async function HomePage() {
  const [front, site, matches] = await Promise.all([readFrontPage(), readSiteSettings(), readMatches()]);
  const matchLead = tickerLine(matches);
  const [pinned, latest, guides, cities, categories, series, feed, wider, community, pros] = await Promise.all([
    listArticlesByIds([...(front.leadId ? [front.leadId] : []), ...front.pins]),
    listArticles({ kind: "news", limit: 12 }),
    listArticles({ kind: "guide", limit: 5 }),
    citiesWithCounts(8),
    categoryCounts(),
    listSeriesWithLatest(),
    activityFeed(24),
    listArticles({ kind: "news", limit: 80 }),
    listPosts({ limit: 6 }),
    listProfessionals({ limit: 4 }),
  ]);
  // Lead, pins and the rest: an editor's choices from /admin/front-page first, then the newest stories.
  const { ordered } = resolveFront(front, latest, new Map(pinned.map((a) => [a.id, a])));
  const slides: Slide[] = ordered
    .filter((a) => a.featuredImageUrl)
    .slice(0, site.front.heroSlides)
    .map((a) => ({ id: a.id, href: articleUrl(a), title: a.title, dek: a.dek, imageUrl: a.featuredImageUrl, label: a.category?.name ?? "News", meta: a.publishedAt ? timeAgo(a.publishedAt) : "" }));
  const slideIds = new Set(slides.map((s) => s.id));
  const headlines = ordered.filter((a) => !slideIds.has(a.id)).slice(0, 8);
  // Desks: our own stories by category group, four each, only groups that have something.
  const DESKS: { label: string; slugs: string[] }[] = [
    { label: "World & US", slugs: ["world", "us", "politics"] },
    { label: "Markets & crypto", slugs: ["markets", "crypto", "business"] },
    { label: "Sport", slugs: ["cricket", "mma", "snooker", "sports"] },
    { label: "Tech & entertainment", slugs: ["technology", "ai", "science", "entertainment", "viral"] },
  ];
  const world = DESKS.map((d) => ({ label: d.label, items: wider.filter((a) => a.category && d.slugs.includes(a.category.slug)).slice(0, 4) })).filter((g) => g.items.length);
  const featuredTools = TOOLS.filter((t) => t.featured).slice(0, 6);
  const topCategories = categories.filter((c) => c.count > 0).slice(0, 10);
  const TICKER_ORDER = site.front.tickerOrder;
  const numbers = series.filter((s) => s.latest).sort((a, b) => (TICKER_ORDER.indexOf(a.slug) + 1 || 99) - (TICKER_ORDER.indexOf(b.slug) + 1 || 99));

  return (
    <div className="container-x">
      {/* One heading for the page; the hero headlines are h2 so five slides do not make five h1s. */}
      <h1 className="sr-only">Searchable.pk: Pakistan news today, prices, guides and calculators</h1>
      {/* Numbers ticker: the day's prices and rates, a slow continuous rail above the fold */}
      {numbers.length ? (
        <NumbersTicker
          leads={matchLead ? [matchLead] : []}
          items={numbers.map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name.replace(/ in Pakistan.*$/i, "").replace(/ today$/i, "").replace(/ \(.*\)$/, "").replace(/ rate$/i, ""),
            unit: s.unit,
            value: s.latest!.value,
            previous: s.previous?.value ?? null,
          }))}
        />
      ) : null}

      {/* Hero: carousel of the top stories + the live feed */}
      {slides.length ? (
        <section className="grid gap-8 py-8 lg:grid-cols-12 lg:gap-10 lg:py-10">
          <div className="lg:col-span-8">
            <HeroCarousel slides={slides} intervalMs={site.front.carouselSeconds * 1000} />
          </div>
          <div className="relative lg:col-span-4 lg:min-h-0">
            <LiveFeed initial={feed} className="max-h-[520px] overflow-hidden lg:absolute lg:inset-0 lg:max-h-none" />
          </div>
        </section>
      ) : null}


      {world.length && site.features.homeWorld ? (
        <section className="border-t border-line py-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="font-display text-2xl">Around the world</h2>
            <p className="text-xs text-3">World, markets, sport and tech from a Pakistani reader&rsquo;s side, in our own words</p>
          </div>
          <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {world.map((g) => (
              <div key={g.label}>
                <p className="rule pt-2 eyebrow">{g.label}</p>
                <ul className="mt-1 divide-y divide-[var(--border)]">
                  {g.items.map((it) => (
                    <li key={it.id} className="py-2">
                      <Link href={articleUrl(it)} className="headline-link text-[15px] leading-snug">
                        {it.title}
                      </Link>
                      <span className="block text-[11px] text-3">
                        {it.category?.name}
                        {it.publishedAt ? ` · ${timeAgo(it.publishedAt)}` : ""}
                      </span>
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
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="font-display text-2xl">Latest</h2>
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
          <h2 className="font-display text-2xl">Calculators</h2>
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
            <h2 className="font-display text-2xl">Guides</h2>
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
                  <h3 className="mt-1 font-display text-xl leading-snug">
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
          <h2 className="font-display text-2xl">Cities</h2>
          <Link href="/cities" className="text-sm font-medium text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
            All cities →
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
          {cities.map((c) => (
            <PhotoTile key={c.id} href={`/cities/${c.slug}`} title={c.name} meta={c.count ? `${c.count} business${c.count === 1 ? "" : "es"}` : undefined} imageUrl={c.imageUrl} />
          ))}
        </div>
      </section>

      {/* Community and professionals */}
      {(community.rows.length && site.features.homeCommunity) || (pros.rows.length && site.features.homeProfessionals) ? (
        <section className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {community.rows.length && site.features.homeCommunity ? (
            <div>
              <div className="rule flex items-baseline justify-between pt-3">
                <h2 className="font-display text-2xl">From the community</h2>
                <Link href="/community" className="text-sm font-medium text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
                  Jobs, listings, questions →
                </Link>
              </div>
              <div className="mt-2">
                {community.rows.slice(0, 5).map((p) => (
                  <PostCard key={p.id} p={p} className="py-3" />
                ))}
              </div>
              <Link href="/community/new" className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline">
                Post something →
              </Link>
            </div>
          ) : null}
          {pros.rows.length ? (
            <div>
              <div className="rule flex items-baseline justify-between pt-3">
                <h2 className="font-display text-2xl">Professionals</h2>
                <Link href="/professionals" className="text-sm font-medium text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
                  Find a professional →
                </Link>
              </div>
              <div className="mt-2">
                {pros.rows.map((p) => (
                  <ProCard key={p.id} p={p} className="py-3" />
                ))}
              </div>
              <Link href="/professionals/join" className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline">
                Create your profile →
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Newsletter */}
      <section className="rule mb-4 mt-4 grid gap-8 py-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Searchable Daily</p>
          <h2 className="mt-2 font-display text-3xl">The useful morning email about Pakistan</h2>
          <p className="mt-3 text-[15px] text-2">Top stories, what changed, one useful number, a tool of the day. Two minutes to read, every morning at 7.</p>
        </div>
        <NewsletterForm source="home" />
      </section>
    </div>
  );
}
