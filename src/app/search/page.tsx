import type { Metadata } from "next";
import Link from "next/link";
import { SearchBox } from "@/components/layout/search-box";
import { EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { TYPE_LABEL, groupHits, logSearch, search, type SearchEntityType, type SearchHit } from "@/lib/search";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { q?: string; type?: string; city?: string; page?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Params> }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `“${q}”` : "Search", robots: { index: false, follow: true } };
}

const TYPE_ORDER: SearchEntityType[] = ["tool", "guide", "business", "news", "location", "entity", "data_series", "comparison"];
const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "tool", label: "Tools" },
  { value: "guide", label: "Guides" },
  { value: "business", label: "Businesses" },
  { value: "news", label: "News" },
  { value: "location", label: "Places" },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", type = "", city, page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limit = 30;
  const types = TYPE_ORDER.includes(type as SearchEntityType) ? [type as SearchEntityType] : undefined;
  const { hits, total } = q ? await search(q, { types, city, limit, offset: (pageNum - 1) * limit }) : { hits: [], total: 0 };
  if (q && pageNum === 1) void logSearch(q, total).catch(() => {});

  const groups = groupHits(hits);
  const best = hits[0];

  return (
    <div className="container-x py-8 sm:py-10">
      <div className="max-w-3xl">
        <SearchBox size="lg" defaultValue={q} autoFocus={!q} />
      </div>

      {q ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={`/search?q=${encodeURIComponent(q)}${f.value ? `&type=${f.value}` : ""}`}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors", type === f.value ? "border-brand-600 bg-brand-700 text-white" : "border-line bg-surface text-2 hover:bg-surface-2")}
              >
                {f.label}
              </Link>
            ))}
            <span className="ml-auto text-sm text-3">{total ? `${total.toLocaleString()} result${total === 1 ? "" : "s"}` : ""}</span>
          </div>

          {hits.length === 0 ? (
            <div className="mt-8 max-w-2xl">
              <EmptyState
                title={`Nothing found for “${q}”`}
                description="Try fewer words, a different spelling, or browse by section. Every search that finds nothing goes on our list of things to build."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link href="/tools" className="text-sm font-medium text-brand-700">Tools</Link>
                    <span className="text-3">·</span>
                    <Link href="/guides" className="text-sm font-medium text-brand-700">Guides</Link>
                    <span className="text-3">·</span>
                    <Link href="/businesses" className="text-sm font-medium text-brand-700">Businesses</Link>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="space-y-8">
                {best && !type ? <BestAnswer hit={best} /> : null}
                {TYPE_ORDER.filter((t) => groups.has(t)).map((t) => {
                  const list = groups.get(t)!.filter((h) => !(best && !type && h === best));
                  if (!list.length) return null;
                  return (
                    <section key={t}>
                      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-3">{TYPE_LABEL[t]}s</h2>
                      <ol className="divide-y divide-[var(--border)] surface px-5">
                        {list.map((h) => (
                          <Hit key={h.entityType + h.entityId} hit={h} />
                        ))}
                      </ol>
                    </section>
                  );
                })}
                {total > limit ? (
                  <nav className="flex items-center justify-between text-sm">
                    {pageNum > 1 ? <Link href={`/search?q=${encodeURIComponent(q)}&type=${type}&page=${pageNum - 1}`} className="font-medium text-brand-700">← Previous</Link> : <span />}
                    <span className="text-3">Page {pageNum} of {Math.ceil(total / limit)}</span>
                    {pageNum * limit < total ? <Link href={`/search?q=${encodeURIComponent(q)}&type=${type}&page=${pageNum + 1}`} className="font-medium text-brand-700">Next →</Link> : <span />}
                  </nav>
                ) : null}
              </div>
              <aside className="space-y-4 lg:sticky lg:top-24 self-start">
                <div className="surface p-5 text-[15px]">
                  <p className="font-semibold">How results are ranked</p>
                  <p className="mt-1.5 text-2">Tools and guides that answer the question directly come first, then businesses and news. Recent news ranks higher than old news.</p>
                </div>
                <div className="surface p-5 text-[15px]">
                  <p className="font-semibold">Can&rsquo;t find it?</p>
                  <p className="mt-1.5 text-2">
                    <Link href="/add-business" className="text-brand-700 dark:text-brand-300">Add a business</Link> or <Link href="/contact" className="text-brand-700 dark:text-brand-300">suggest a guide or tool</Link>.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 text-2">Search news, guides, calculators, businesses and places across Pakistan.</p>
      )}
    </div>
  );
}

function BestAnswer({ hit }: { hit: SearchHit }) {
  return (
    <Link href={hit.url} className="group block surface border-brand-300 dark:border-brand-700 p-6 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-colors">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">Best match · {TYPE_LABEL[hit.entityType]}</p>
      <h2 className="mt-1.5 text-2xl font-semibold leading-snug group-hover:text-brand-800 dark:group-hover:text-brand-200">{hit.title}</h2>
      {hit.headline ? <p className="mt-2 text-[15px] text-2 [&_mark]:font-medium" dangerouslySetInnerHTML={{ __html: hit.headline }} /> : hit.summary ? <p className="mt-2 text-[15px] text-2">{hit.summary}</p> : null}
      <p className="mt-3 text-sm text-3">{[hit.category, hit.city].filter(Boolean).join(" · ")}</p>
    </Link>
  );
}

function Hit({ hit }: { hit: SearchHit }) {
  return (
    <li className="py-4">
      <Link href={hit.url} className="group block">
        <div className="flex items-baseline gap-2">
          <span className="w-[4.5rem] shrink-0 text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">{TYPE_LABEL[hit.entityType]}</span>
          <div className="min-w-0">
            <p className="font-medium leading-snug group-hover:text-brand-800 dark:group-hover:text-brand-200">{hit.title}</p>
            {hit.headline ? <p className="mt-1 text-[15px] text-2 [&_mark]:font-medium" dangerouslySetInnerHTML={{ __html: hit.headline }} /> : hit.summary ? <p className="mt-1 text-[15px] text-2 line-clamp-2">{hit.summary}</p> : null}
            <p className="mt-1 text-xs text-3">
              {[hit.category, hit.city, hit.entityType === "news" && hit.publishedAt ? formatDate(hit.publishedAt) : null].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}
