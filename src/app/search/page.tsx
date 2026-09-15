import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { Rating, toolExample } from "@/components/cards";
import { SearchBox } from "@/components/layout/search-box";
import { ResultsTracker } from "@/components/search/results-tracker";
import { citiesWithCounts } from "@/db/queries/geo";
import { formatDate, number, timeAgo } from "@/lib/format";
import { TYPE_LABEL, didYouMean, groupHits, logSearch, popularSearches, relatedSearches, search, trendingSearches, type SearchEntityType, type SearchHit, type SearchResult } from "@/lib/search";
import { cn } from "@/lib/utils";
import { TOOLS } from "@/tools/registry";

export const dynamic = "force-dynamic";

type Params = { q?: string; type?: string; city?: string; page?: string; sort?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `“${q}”` : "Search", robots: { index: false, follow: true } };
}

const TYPE_ORDER: SearchEntityType[] = ["tool", "data_series", "guide", "comparison", "professional", "business", "news", "location", "entity"];
const PLURAL: Record<SearchEntityType, string> = { tool: "Calculators", guide: "Guides", news: "News", business: "Businesses", entity: "Topics", location: "Places", data_series: "Data", comparison: "Comparisons", professional: "Professionals" };
const FILTERS: { value: SearchEntityType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "tool", label: "Calculators" },
  { value: "guide", label: "Guides" },
  { value: "data_series", label: "Data" },
  { value: "business", label: "Businesses" },
  { value: "professional", label: "Professionals" },
  { value: "news", label: "News" },
  { value: "location", label: "Places" },
];
// The side rails change slowly; cache them so a search costs one query, not four.
const sideRails = unstable_cache(async () => Promise.all([trendingSearches(6), popularSearches(8), citiesWithCounts(8)]), ["search-side-rails"], { revalidate: 600 });

const SAMPLE_QUERIES = ["income tax on 150000 salary", "petrol price today", "usd to pkr", "lesco bill check", "pta tax iphone 16", "net metering", "solar companies in lahore", "zakat on gold", "car prices", "kibor rate"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", type = "", city, page = "1", sort = "" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limit = 30;
  const typeKey = TYPE_ORDER.includes(type as SearchEntityType) ? (type as SearchEntityType) : "";
  const types = typeKey ? [typeKey] : undefined;
  const newest = sort === "newest";
  const [result, [trending, popular, cities]] = await Promise.all([
    q ? search(q, { types, city, limit, offset: (pageNum - 1) * limit, sort: newest ? "newest" : "relevance" }) : Promise.resolve<SearchResult>({ hits: [], total: 0, facets: {}, intent: "general" }),
    sideRails(),
  ]);
  const { hits, total, facets } = result;
  const [suggestion, related] = q ? await Promise.all([hits.length === 0 || hits[0]?.fuzzy ? didYouMean(q) : Promise.resolve(null), relatedSearches(q, 6)]) : [null, []];
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ q });
    const merged: Record<string, string | undefined> = { type: typeKey, city, sort: newest ? "newest" : undefined, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/search?${p.toString()}`;
  };
  if (q && pageNum === 1) void logSearch(q, total).catch(() => {});

  const groups = groupHits(hits);
  const best = !typeKey && pageNum === 1 && !hits[0]?.fuzzy ? hits[0] : undefined;
  const showCity = !typeKey || typeKey === "business" || typeKey === "news";

  return (
    <div className="container-x py-8 sm:py-10">
      <div className="max-w-3xl">
        <SearchBox size="lg" defaultValue={q} autoFocus={!q} />
      </div>

      {!q ? (
        <EmptyQuery popular={popular} trending={trending} />
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line">
            <nav className="-mb-px flex gap-5 overflow-x-auto no-scrollbar" aria-label="Filter by type">
              {FILTERS.map((f) => {
                const n = f.value ? facets[f.value] : total;
                if (f.value && !n && typeKey !== f.value) return null;
                return (
                  <Link key={f.value} href={qs({ type: f.value || undefined, page: undefined })} className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-[14.5px] font-medium", typeKey === f.value ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-2 hover:text-[var(--text)]")}>
                    {f.label}
                    {n ? <span className="text-[12px] tabular text-3">{n.toLocaleString()}</span> : null}
                  </Link>
                );
              })}
            </nav>
            <p className="pb-2 text-sm text-3">
              {total ? `${total.toLocaleString()} result${total === 1 ? "" : "s"} for “${q}”` : `No results for “${q}”`}
            </p>
          </div>

          {(showCity && cities.length) || typeKey === "news" ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px]">
              {showCity && cities.length ? (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="mr-1 text-3">City</span>
                  <Link href={qs({ city: undefined, page: undefined })} className={cn("px-1.5 py-0.5", !city ? "font-semibold underline underline-offset-4" : "text-2 hover:text-[var(--text)]")}>Anywhere</Link>
                  {cities.map((c) => (
                    <Link key={c.id} href={qs({ city: c.slug, page: undefined })} className={cn("px-1.5 py-0.5", city === c.slug ? "font-semibold underline underline-offset-4" : "text-2 hover:text-[var(--text)]")}>
                      {c.name}
                    </Link>
                  ))}
                </div>
              ) : null}
              {typeKey === "news" ? (
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-3">Sort</span>
                  <Link href={qs({ sort: undefined, page: undefined })} className={cn("px-1.5 py-0.5", !newest ? "font-semibold underline underline-offset-4" : "text-2 hover:text-[var(--text)]")}>Relevance</Link>
                  <Link href={qs({ sort: "newest", page: undefined })} className={cn("px-1.5 py-0.5", newest ? "font-semibold underline underline-offset-4" : "text-2 hover:text-[var(--text)]")}>Newest</Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {suggestion ? (
            <p className="mt-5 text-[15px] text-2">
              {hits.length ? "No exact match. " : ""}Did you mean{" "}
              <Link href={qs({ q: suggestion, page: undefined })} className="font-medium text-[var(--text)] underline underline-offset-4">
                {suggestion}
              </Link>
              ?
            </p>
          ) : hits[0]?.fuzzy ? (
            <p className="mt-5 text-[15px] text-2">No exact match for “{q}”. Showing the closest matches.</p>
          ) : null}

          {hits.length === 0 ? (
            <NoResults q={q} popular={popular} typeKey={typeKey} city={city} qs={qs} />
          ) : (
            <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
              <ResultsTracker q={q}>
                <div className="space-y-9">
                  {best ? <Answer hit={best} /> : null}
                  {TYPE_ORDER.filter((t) => groups.has(t)).map((t) => {
                    const list = groups.get(t)!.filter((h) => h !== best);
                    if (!list.length) return null;
                    const more = !typeKey && facets[t] && facets[t]! > list.length + (best?.entityType === t ? 1 : 0);
                    return (
                      <section key={t}>
                        <div className="mb-2 flex items-baseline justify-between border-b-2 border-[var(--rule)] pb-1.5">
                          <h2 className="eyebrow">{PLURAL[t]}</h2>
                          {more ? (
                            <Link href={qs({ type: t, page: undefined })} className="text-[13px] font-medium text-2 underline-offset-4 hover:underline">
                              All {facets[t]} →
                            </Link>
                          ) : null}
                        </div>
                        <ol className="divide-y divide-[var(--border)]">
                          {list.map((h) => (
                            <Hit key={h.entityType + h.entityId} hit={h} />
                          ))}
                        </ol>
                      </section>
                    );
                  })}
                  {total > limit ? (
                    <nav className="flex items-center justify-between border-t border-line pt-4 text-sm" aria-label="Pagination">
                      {pageNum > 1 ? <Link href={qs({ page: String(pageNum - 1) })} className="font-medium underline-offset-4 hover:underline">← Previous</Link> : <span />}
                      <span className="text-3">Page {pageNum} of {Math.ceil(total / limit)}</span>
                      {pageNum * limit < total ? <Link href={qs({ page: String(pageNum + 1) })} className="font-medium underline-offset-4 hover:underline">Next →</Link> : <span />}
                    </nav>
                  ) : null}
                  {related.length ? (
                    <section className="border-t border-line pt-5">
                      <h2 className="eyebrow">People also searched</h2>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {related.map((r) => (
                          <li key={r}>
                            <Link href={`/search?q=${encodeURIComponent(r)}`} className="inline-block border border-line px-3 py-1.5 text-[14px] text-2 hover:border-ink-500 hover:text-[var(--text)]">
                              {r}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              </ResultsTracker>
              <aside className="space-y-6 self-start text-[14.5px] lg:sticky lg:top-24">
                {trending.length ? (
                  <div>
                    <p className="eyebrow">Trending today</p>
                    <ul className="mt-2 divide-y divide-[var(--border)]">
                      {trending.map((t, i) => (
                        <li key={t.query}>
                          <Link href={`/search?q=${encodeURIComponent(t.query)}`} className="flex items-baseline gap-3 py-1.5 text-2 hover:text-[var(--text)]">
                            <span className="w-4 shrink-0 font-serif text-3">{i + 1}</span>
                            <span>{t.query}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="border-t border-line pt-4 text-2">
                  <p className="font-medium text-[var(--text)]">How results are ranked</p>
                  <p className="mt-1">Calculators, data and guides that answer the question directly come first, then businesses and news. Recent news outranks old news. Typos and Roman Urdu (bijli, sona) are understood.</p>
                </div>
                <div className="border-t border-line pt-4 text-2">
                  <p className="font-medium text-[var(--text)]">Can&rsquo;t find it?</p>
                  <p className="mt-1">
                    <Link href="/add-business" className="underline underline-offset-4">Add a business</Link> or <Link href="/contact" className="underline underline-offset-4">suggest a guide or calculator</Link>. Every search that finds nothing goes on our list of things to build.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyQuery({ popular, trending }: { popular: { query: string }[]; trending: { query: string }[] }) {
  const chips = (trending.length ? trending : popular).map((p) => p.query);
  const list = chips.length ? chips : SAMPLE_QUERIES;
  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <p className="eyebrow">{chips.length ? (trending.length ? "Trending today" : "Popular searches") : "Try"}</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {list.map((c) => (
            <li key={c}>
              <Link href={`/search?q=${encodeURIComponent(c)}`} className="inline-block border border-line px-3 py-1.5 text-[14.5px] text-2 hover:border-ink-500 hover:text-[var(--text)]">
                {c}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 eyebrow">Or browse</p>
        <div className="mt-2 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {[
            { href: "/tools", title: "Calculators", body: `${TOOLS.length} tax, salary, loan, utility and car tools with worked examples.` },
            { href: "/data", title: "Live data", body: "Petrol, gold, dollar, KIBOR, policy rate, KSE-100 and Bitcoin with history." },
            { href: "/guides", title: "Guides", body: "How to register, apply, check, renew and file, step by step." },
            { href: "/businesses", title: "Businesses", body: "Verified listings by category and city, with phone numbers and hours." },
            { href: "/news", title: "News", body: "Pakistan, world, markets, crypto, cricket, MMA and snooker." },
            { href: "/compare", title: "Compare", body: "New car prices and solar inverters side by side." },
          ].map((b) => (
            <Link key={b.href} href={b.href} className="group border-t border-line pt-3">
              <p className="font-serif text-lg font-medium group-hover:underline underline-offset-4">{b.title}</p>
              <p className="mt-0.5 text-[14.5px] text-2">{b.body}</p>
            </Link>
          ))}
        </div>
      </div>
      <aside className="text-[14.5px] text-2 lg:pt-6">
        <p className="font-medium text-[var(--text)]">Search tips</p>
        <ul className="mt-2 space-y-1.5">
          <li>Type a number with a question: <em>tax on 200000 salary</em>.</li>
          <li>Add a city for businesses: <em>dentist in lahore</em>.</li>
          <li>Roman Urdu works: <em>bijli bill</em>, <em>sona rate</em>.</li>
          <li>Quote an exact phrase: <em>&quot;net metering&quot;</em>. Exclude a word with a minus.</li>
          <li>Press <kbd className="border border-line px-1 font-sans text-[12px]">/</kbd> anywhere to jump to search.</li>
        </ul>
      </aside>
    </div>
  );
}

function NoResults({ q, popular, typeKey, city, qs }: { q: string; popular: { query: string }[]; typeKey: string; city?: string; qs: (extra: Record<string, string | undefined>) => string }) {
  return (
    <div className="mt-8 max-w-2xl">
      <p className="font-serif text-2xl">Nothing found for “{q}”</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-2">
        {typeKey || city ? (
          <li>
            <Link href={qs({ type: undefined, city: undefined, page: undefined })} className="underline underline-offset-4">Search everything</Link> instead of only {typeKey ? PLURAL[typeKey as SearchEntityType].toLowerCase() : "this city"}.
          </li>
        ) : null}
        <li>Try fewer or different words. Roman Urdu is fine.</li>
        <li>
          Browse <Link href="/tools" className="underline underline-offset-4">calculators</Link>, <Link href="/guides" className="underline underline-offset-4">guides</Link>, <Link href="/data" className="underline underline-offset-4">data</Link> or <Link href="/businesses" className="underline underline-offset-4">businesses</Link>.
        </li>
        <li>This search is now on our list. <Link href="/contact" className="underline underline-offset-4">Tell us what you were after</Link> and we will write it.</li>
      </ul>
      {popular.length ? (
        <div className="mt-6">
          <p className="eyebrow">Popular searches</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {popular.map((p) => (
              <li key={p.query}>
                <Link href={`/search?q=${encodeURIComponent(p.query)}`} className="inline-block border border-line px-3 py-1.5 text-[14px] text-2 hover:border-ink-500 hover:text-[var(--text)]">
                  {p.query}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** The best match, with the answer itself where we have it: a live figure, a worked example, a rating. */
function Answer({ hit }: { hit: SearchHit }) {
  const meta = hit.meta as { latest?: { date: string; value: number } | null; unit?: string; source?: string | null; slug?: string; rating?: number; ratingCount?: number; phone?: string | null; verified?: boolean };
  let figure: { value: string; label: string } | null = null;
  if (hit.entityType === "data_series" && meta.latest) {
    const v = meta.latest.value;
    figure = { value: meta.unit === "%" ? `${number(v, 2)}%` : `${number(v, Number.isInteger(v) ? 0 : 2)} ${meta.unit ?? ""}`.trim(), label: `as of ${formatDate(meta.latest.date)}${meta.source ? ` · ${meta.source}` : ""}` };
  } else if (hit.entityType === "tool" && meta.slug) {
    const tool = TOOLS.find((t) => t.slug === meta.slug);
    const ex = tool ? toolExample(tool) : null;
    if (ex) figure = { value: ex.value, label: `${ex.label} (example, defaults)` };
  }
  return (
    <Link href={hit.url} className="group block border-y-2 border-[var(--rule)] py-5">
      <p className="eyebrow">Best match · {TYPE_LABEL[hit.entityType]}</p>
      <div className={cn("mt-2 grid gap-4", figure && "sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start")}>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold leading-tight group-hover:underline underline-offset-4 sm:text-3xl">{hit.title}</h2>
          {hit.headline ? <p className="mt-2 text-[15px] text-2 [&_mark]:bg-transparent [&_mark]:font-medium [&_mark]:text-[var(--text)]" dangerouslySetInnerHTML={{ __html: hit.headline }} /> : hit.summary ? <p className="mt-2 text-[15px] text-2">{hit.summary}</p> : null}
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-3">
            {[hit.category, hit.city].filter(Boolean).join(" · ")}
            {(hit.entityType === "business" || hit.entityType === "professional") && typeof meta.rating === "number" && meta.ratingCount ? <Rating avg={meta.rating} count={meta.ratingCount} /> : null}
            {(hit.entityType === "business" || hit.entityType === "professional") && meta.phone ? <span className="tabular">{meta.phone}</span> : null}
            {(hit.entityType === "business" || hit.entityType === "professional") && meta.verified ? <span className="font-medium text-[var(--text)]">Verified</span> : null}
          </p>
        </div>
        {figure ? (
          <div className="border-t border-line pt-3 sm:min-w-44 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
            <p className="font-serif text-3xl leading-none tabular sm:text-4xl">{figure.value}</p>
            <p className="mt-1.5 text-[12.5px] text-3">{figure.label}</p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

/** Fresh news reads as "3 hours ago", older news as a date. */
function newsDate(d: Date): string {
  return Date.now() - d.getTime() < 86400_000 * 2 ? timeAgo(d) : formatDate(d);
}

function Hit({ hit }: { hit: SearchHit }) {
  const meta = hit.meta as { latest?: { date: string; value: number } | null; unit?: string; rating?: number; ratingCount?: number; verified?: boolean };
  const thumb = hit.imageUrl && (hit.entityType === "news" || hit.entityType === "business" || hit.entityType === "guide" || hit.entityType === "professional");
  const when = hit.entityType === "news" && hit.publishedAt ? newsDate(hit.publishedAt) : null;
  return (
    <li>
      <Link href={hit.url} className="group flex gap-4 py-3.5">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hit.imageUrl!} alt="" loading="lazy" width={96} height={64} className="hidden h-16 w-24 shrink-0 object-cover sm:block" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug group-hover:underline underline-offset-4">{hit.title}</p>
          {hit.headline ? <p className="mt-1 text-[14.5px] text-2 line-clamp-2 [&_mark]:bg-transparent [&_mark]:font-medium [&_mark]:text-[var(--text)]" dangerouslySetInnerHTML={{ __html: hit.headline }} /> : hit.summary ? <p className="mt-1 text-[14.5px] text-2 line-clamp-2">{hit.summary}</p> : null}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] text-3">
            <span>{[hit.category, hit.city, when].filter(Boolean).join(" · ")}</span>
            {(hit.entityType === "business" || hit.entityType === "professional") && typeof meta.rating === "number" && meta.ratingCount ? <Rating avg={meta.rating} count={meta.ratingCount} /> : null}
            {(hit.entityType === "business" || hit.entityType === "professional") && meta.verified ? <span className="font-medium text-[var(--text)]">Verified</span> : null}
            {hit.fuzzy ? <span>close match</span> : null}
          </p>
        </div>
        {hit.entityType === "data_series" && meta.latest ? (
          <span className="shrink-0 self-center font-serif text-xl tabular">{meta.unit === "%" ? `${number(meta.latest.value, 2)}%` : number(meta.latest.value, Number.isInteger(meta.latest.value) ? 0 : 2)}</span>
        ) : null}
      </Link>
    </li>
  );
}
