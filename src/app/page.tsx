import { ArrowRight, Calculator, Compass, Newspaper, Store } from "lucide-react";
import Link from "next/link";
import { ArticleCard, ToolCard } from "@/components/cards";
import { SearchBox } from "@/components/layout/search-box";
import { NewsletterForm } from "@/components/newsletter-form";
import { SectionHeader } from "@/components/ui";
import { listArticles } from "@/db/queries/content";
import { categoryCounts } from "@/db/queries/directory";
import { citiesWithCounts } from "@/db/queries/geo";
import { popularSearches } from "@/lib/search";
import { TOOLS } from "@/tools/registry";

export const revalidate = 300;

const EXAMPLES = ["PTA tax on iPhone 17", "income tax on 250,000 salary", "solar companies in Lahore", "how to become a filer", "electricity bill for 350 units"];

const PILLARS = [
  { href: "/news", icon: Newspaper, title: "Know", text: "News with the useful context — what changed and what it means for you." },
  { href: "/businesses", icon: Store, title: "Find", text: "Businesses and services across Pakistan, with hours, phone and WhatsApp." },
  { href: "/tools", icon: Calculator, title: "Do", text: "Calculators for tax, bills, loans, zakat and more — sourced and dated." },
  { href: "/guides", icon: Compass, title: "Understand", text: "Step-by-step guides for government, banking, cars and property." },
];

export default async function HomePage() {
  const [featured, latest, guides, cities, categories, popular] = await Promise.all([
    listArticles({ kind: "news", featured: true, limit: 1 }),
    listArticles({ kind: "news", limit: 6 }),
    listArticles({ kind: "guide", limit: 4 }),
    citiesWithCounts(8),
    categoryCounts(),
    popularSearches(6),
  ]);
  const lead = featured[0] ?? latest[0];
  const rest = latest.filter((a) => a.id !== lead?.id).slice(0, 5);
  const featuredTools = TOOLS.filter((t) => t.featured).slice(0, 6);
  const topCategories = categories.filter((c) => c.count > 0).slice(0, 12);

  return (
    <>
      {/* Hero: search is the product */}
      <section className="border-b border-line bg-surface">
        <div className="container-x py-14 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">What do you want to know?</h1>
            <p className="mt-4 text-lg text-2 sm:text-xl">Pakistan&rsquo;s information platform. News, guides, calculators, businesses and data — all searchable in one place.</p>
            <div className="mt-8">
              <SearchBox size="lg" autoFocus placeholder="Try “PTA tax on iPhone” or “restaurants in DHA Lahore”" />
            </div>
            <ul className="mt-5 flex flex-wrap justify-center gap-2">
              {(popular.length >= 4 ? popular.map((p) => p.query) : EXAMPLES).map((q) => (
                <li key={q}>
                  <Link href={`/search?q=${encodeURIComponent(q)}`} className="inline-flex rounded-full border border-line bg-[var(--bg)] px-3.5 py-1.5 text-sm text-2 hover:border-brand-400 hover:text-[var(--text)] transition-colors">
                    {q}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="container-x py-10 sm:py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <Link key={p.href} href={p.href} className="group surface p-5 hover:border-brand-300 transition-colors">
              <p.icon className="size-6 text-brand-700 dark:text-brand-300" aria-hidden />
              <p className="mt-3 text-lg font-semibold">{p.title}</p>
              <p className="mt-1 text-[15px] text-2">{p.text}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 dark:text-brand-300">
                Explore <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* News */}
      {lead ? (
        <section className="container-x py-8 sm:py-10">
          <SectionHeader title="Latest" description="What changed, and what it means for you." href="/news" />
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <ArticleCard article={lead} variant="feature" />
            <div className="surface divide-y divide-[var(--border)] px-5">
              {rest.map((a) => (
                <ArticleCard key={a.id} article={a} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Tools */}
      <section className="container-x py-8 sm:py-10">
        <SectionHeader title="Calculators & tools" description="Real numbers, sourced and dated. Runs instantly, nothing stored." href="/tools" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredTools.map((t) => (
            <ToolCard key={t.slug} tool={t} />
          ))}
        </div>
      </section>

      {/* Guides */}
      {guides.length ? (
        <section className="container-x py-8 sm:py-10">
          <SectionHeader title="Guides" description="Step by step, with fees, timelines and the mistakes to avoid." href="/guides" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {guides.map((g) => (
              <ArticleCard key={g.id} article={g} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Directory */}
      <section className="container-x py-8 sm:py-10">
        <SectionHeader title="Find a business" description="Browse by what you need, then by city." href="/businesses" />
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="surface p-5">
            <p className="text-sm font-semibold uppercase tracking-wider text-3">Popular categories</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {topCategories.map((c) => (
                <li key={c.id}>
                  <Link href={`/businesses/${c.slug}`} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-surface-2">
                    <span className="flex items-center gap-2">
                      <span aria-hidden>{c.icon}</span>
                      {c.namePlural ?? c.name}
                    </span>
                    <span className="text-xs tabular text-3">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="surface p-5">
            <p className="text-sm font-semibold uppercase tracking-wider text-3">Cities</p>
            <ul className="mt-3 space-y-1">
              {cities.map((c) => (
                <li key={c.id}>
                  <Link href={`/cities/${c.slug}`} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-surface-2">
                    <span>{c.name}</span>
                    <span className="text-xs tabular text-3">{c.count ? `${c.count} listed` : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/cities" className="mt-2 inline-block px-3 text-sm font-medium text-brand-700 dark:text-brand-300">
              All cities →
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="container-x py-10 sm:py-14">
        <div className="surface bg-brand-50 dark:bg-brand-950/30 border-brand-200 dark:border-brand-800 p-6 sm:p-10 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">Searchable Daily</p>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">The useful morning email about Pakistan</h2>
            <p className="mt-3 text-2 text-[17px]">Top stories, what changed, one useful number, a tool of the day. Two minutes to read. Every morning at 7.</p>
          </div>
          <div className="mt-6 lg:mt-0">
            <NewsletterForm source="home" />
          </div>
        </div>
      </section>
    </>
  );
}
