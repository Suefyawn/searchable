import { ArrowUpRight, Calculator, Compass, Newspaper, Store } from "lucide-react";
import Link from "next/link";
import { ArticleCard, ToolCard } from "@/components/cards";
import { Change } from "@/components/data/change";
import { SearchBox } from "@/components/layout/search-box";
import { NewsletterForm } from "@/components/newsletter-form";
import { SectionHeader } from "@/components/ui";
import { listArticles } from "@/db/queries/content";
import { listSeriesWithLatest } from "@/db/queries/data";
import { categoryCounts, countBusinesses } from "@/db/queries/directory";
import { citiesWithCounts } from "@/db/queries/geo";
import { formatDate, number } from "@/lib/format";
import { popularSearches } from "@/lib/search";
import { TOOLS } from "@/tools/registry";

export const revalidate = 300;

const EXAMPLES = ["PTA tax on iPhone 17", "income tax on 250,000 salary", "solar companies in Lahore", "how to become a filer", "electricity bill for 350 units"];

const PILLARS = [
  { href: "/news", icon: Newspaper, title: "Know", text: "News with the useful context — what changed and what it means for you.", tone: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200" },
  { href: "/businesses", icon: Store, title: "Find", text: "Businesses and services across Pakistan, with hours, phone and WhatsApp.", tone: "bg-sky-100 text-sky-700 dark:bg-sky-700/30 dark:text-sky-100" },
  { href: "/tools", icon: Calculator, title: "Do", text: "Calculators for tax, bills, loans and zakat — sourced and dated.", tone: "bg-accent-100 text-accent-700 dark:bg-accent-700/30 dark:text-accent-300" },
  { href: "/guides", icon: Compass, title: "Understand", text: "Step-by-step guides for government, banking, cars and property.", tone: "bg-violet-100 text-violet-700 dark:bg-violet-700/30 dark:text-violet-100" },
];

export default async function HomePage() {
  const [featured, latest, guides, cities, categories, popular, series, businessCount] = await Promise.all([
    listArticles({ kind: "news", featured: true, limit: 1 }),
    listArticles({ kind: "news", limit: 6 }),
    listArticles({ kind: "guide", limit: 4 }),
    citiesWithCounts(10),
    categoryCounts(),
    popularSearches(6),
    listSeriesWithLatest(),
    countBusinesses(),
  ]);
  const lead = featured[0] ?? latest[0];
  const rest = latest.filter((a) => a.id !== lead?.id).slice(0, 4);
  const featuredTools = TOOLS.filter((t) => t.featured).slice(0, 6);
  const topCategories = categories.filter((c) => c.count > 0).slice(0, 12);
  const ticker = series.filter((s) => s.latest).slice(0, 5);

  return (
    <>
      {/* Hero */}
      <section className="hero-bg">
        <div className="container-x pb-14 pt-16 sm:pb-20 sm:pt-24 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="rise eyebrow">Pakistan&rsquo;s information platform</p>
            <h1 className="rise mt-4 font-display text-[2.75rem] font-bold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
              What do you want <span className="text-gradient">to know?</span>
            </h1>
            <p className="rise-2 mx-auto mt-5 max-w-xl text-lg text-2 sm:text-xl">News, guides, calculators, businesses and data — all searchable in one place.</p>
            <div className="rise-2 mt-9">
              <SearchBox size="lg" autoFocus placeholder="Try “PTA tax on iPhone” or “restaurants in DHA Lahore”" />
            </div>
            <ul className="rise-3 mt-5 flex flex-wrap justify-center gap-2">
              {(popular.length >= 4 ? popular.map((p) => p.query) : EXAMPLES).map((q) => (
                <li key={q}>
                  <Link href={`/search?q=${encodeURIComponent(q)}`} className="inline-flex rounded-full bg-surface/80 px-3.5 py-1.5 text-sm font-medium text-2 ring-line transition-colors hover:bg-surface hover:text-[var(--text)]">
                    {q}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Live numbers strip */}
          {ticker.length ? (
            <div className="rise-3 mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {ticker.map((s) => (
                <Link key={s.id} href={`/data/${s.slug}`} className="glass rounded-2xl px-4 py-3 transition-colors hover:bg-surface">
                  <p className="truncate text-[11px] font-bold uppercase tracking-[0.1em] text-3">{s.name}</p>
                  <p className="mt-0.5 font-display text-xl font-bold tabular">
                    {s.unit === "%" ? `${number(s.latest!.value, 2)}%` : number(s.latest!.value, Number.isInteger(s.latest!.value) ? 0 : 2)}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-3">
                    <span className="whitespace-nowrap">{formatDate(s.latest!.date, { day: "numeric", month: "short" })}</span>
                    <Change latest={s.latest!.value} previous={s.previous?.value ?? null} unit={s.unit} />
                  </p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Pillars */}
      <section className="container-x py-12 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <Link key={p.href} href={p.href} className="group surface surface-hover p-6">
              <span className={`grid size-12 place-items-center rounded-2xl ${p.tone}`}>
                <p.icon className="size-6" aria-hidden />
              </span>
              <p className="mt-5 font-display text-2xl font-semibold">{p.title}</p>
              <p className="mt-1.5 text-[15px] text-2">{p.text}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
                Explore <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* News */}
      {lead ? (
        <section className="container-x py-10 sm:py-14">
          <SectionHeader eyebrow="Latest" title="What changed, and what it means for you" href="/news" hrefLabel="All news" />
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <ArticleCard article={lead} variant="feature" />
            <div className="surface divide-y divide-[var(--border)] px-6 py-2">
              {rest.map((a) => (
                <ArticleCard key={a.id} article={a} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Tools */}
      <section className="px-3 py-10 sm:px-5 sm:py-14">
        <div className="mx-auto max-w-[76rem] rounded-[2rem] bg-surface-2 px-6 py-12 sm:px-10 sm:py-16">
          <SectionHeader eyebrow="Calculators" title="Real numbers. Sourced, dated, instant." description="Every tool shows where its rates come from and when they were last checked. Nothing you enter is stored." href="/tools" hrefLabel={`All ${TOOLS.length} tools`} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTools.map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </div>
      </section>

      {/* Guides */}
      {guides.length ? (
        <section className="container-x py-10 sm:py-14">
          <SectionHeader eyebrow="Guides" title="How things actually work" description="Step by step, with fees, timelines and the mistakes to avoid." href="/guides" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {guides.map((g) => (
              <ArticleCard key={g.id} article={g} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Directory */}
      <section className="container-x py-10 sm:py-14">
        <SectionHeader eyebrow="Directory" title="Find a business" description={`${businessCount.toLocaleString()} listings and growing. Browse by what you need, then by city.`} href="/businesses" />
        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="surface p-6">
            <p className="eyebrow">Popular categories</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {topCategories.map((c) => (
                <li key={c.id}>
                  <Link href={`/businesses/${c.slug}`} className="flex items-center justify-between rounded-xl px-3.5 py-2.5 transition-colors hover:bg-surface-2">
                    <span className="flex items-center gap-2.5 font-medium">
                      <span className="text-lg" aria-hidden>{c.icon}</span>
                      {c.namePlural ?? c.name}
                    </span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold tabular text-3">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="surface p-6">
            <p className="eyebrow">Cities</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {cities.map((c) => (
                <li key={c.id}>
                  <Link href={`/cities/${c.slug}`} className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-2 text-sm font-medium transition-colors hover:bg-surface-3">
                    {c.name}
                    {c.count ? <span className="text-xs tabular text-3">{c.count}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/cities" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
              All cities <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="px-3 py-10 sm:px-5 sm:py-14">
        <div className="relative mx-auto max-w-[76rem] overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-ink-950 px-6 py-12 text-white sm:px-10 sm:py-16 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12">
          <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand-400/30 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-accent-500/20 blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-200">Searchable Daily</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">The useful morning email about Pakistan</h2>
            <p className="mt-4 text-[17px] text-brand-100/90">Top stories, what changed, one useful number, a tool of the day. Two minutes to read. Every morning at 7.</p>
          </div>
          <div className="relative mt-8 rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur lg:mt-0 [&_input]:bg-white [&_input]:text-ink-900 [&_input]:ring-0 [&_.text-2]:text-brand-100 [&_p.text-xs]:text-brand-200 [&_button[aria-pressed=false]]:bg-white/10 [&_button[aria-pressed=false]]:text-white [&_button[aria-pressed=false]]:ring-1 [&_button[aria-pressed=false]]:ring-white/20 [&_label]:text-brand-100">
            <NewsletterForm source="home" />
          </div>
        </div>
      </section>
    </>
  );
}
