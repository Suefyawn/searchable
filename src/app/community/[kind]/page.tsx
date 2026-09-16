import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/community/post-card";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { citiesWithCounts } from "@/db/queries/geo";
import { listPosts, postCounts, postTopics } from "@/lib/community";
import { POST_KINDS, type PostKindKey } from "@/lib/community-schema";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { HUB_COPY } from "@/lib/seo-copy";
import { cn } from "@/lib/utils";

export const revalidate = 300;

const DESCRIPTIONS: Record<string, string> = {
  all: "Jobs, things for sale, auctions, questions and discussions from members across Pakistan. Every post is checked by an editor before it appears.",
  job: "Government and private vacancies across Pakistan from official notices (FPSC, PPSC, NTS, the forces, banks and companies), with pay where given, closing dates and where to apply. New jobs every day.",
  listing: "Things members are selling or renting: cars, phones, furniture, property and more, with prices and photos.",
  auction: "Open auctions from members: set a bid before the clock runs out.",
  question: "Questions about living, working and doing business in Pakistan, answered by members and our desk.",
  discussion: "What members are talking about.",
};

function resolveKind(kind: string): PostKindKey | "all" | null {
  if (kind === "all") return "all";
  const k = POST_KINDS.find((x) => x.key === kind || x.plural.toLowerCase() === kind);
  return k?.key ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  const k = resolveKind(kind);
  if (!k) return { title: "Community" };
  const label = k === "all" ? "Community" : POST_KINDS.find((x) => x.key === k)!.plural;
  return buildMetadata({ title: kind === "all" ? HUB_COPY.community.title : k === "job" ? "Jobs in Pakistan Today: Government and Private Vacancies, Closing Dates" : `${label} in Pakistan: Community Posts`, description: kind === "all" ? HUB_COPY.community.description : DESCRIPTIONS[k], path: `/community/${kind}`, kicker: "Community" });
}

export default async function CommunityList({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ city?: string; topic?: string; sort?: string; page?: string }> }) {
  const { kind } = await params;
  const { city, topic, sort = "new", page = "1" } = await searchParams;
  const k = resolveKind(kind);
  if (!k) notFound();
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limit = 30;
  const [{ rows, total }, counts, topics, cities] = await Promise.all([
    listPosts({ kind: k === "all" ? undefined : k, citySlug: city, topic, sort: sort === "top" ? "top" : "new", limit, offset: (pageNum - 1) * limit }),
    postCounts(),
    postTopics(k === "all" ? undefined : k, 12),
    citiesWithCounts(8),
  ]);
  const label = k === "all" ? "Community" : POST_KINDS.find((x) => x.key === k)!.plural;
  const total_all = Object.values(counts).reduce((a, b) => a + b, 0);
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [key, v] of Object.entries({ city, topic, sort: sort === "top" ? "top" : undefined, ...extra })) if (v) p.set(key, v);
    const s = p.toString();
    return `/community/${kind}${s ? `?${s}` : ""}`;
  };
  const crumbs = [{ name: "Community", path: "/community" }, ...(k !== "all" ? [{ name: label, path: `/community/${k}` }] : [])];

  return (
    <div className="container-x py-8 sm:py-10">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      {k !== "all" ? <Breadcrumbs items={crumbs} className="mb-6" /> : null}
      <SectionHeader as="h1" title={k === "all" ? "Community" : k === "job" ? "Jobs in Pakistan today" : label} description={DESCRIPTIONS[k]} href="/community/new" hrefLabel="Post something" />

      <nav className="-mb-px flex gap-5 overflow-x-auto no-scrollbar border-b border-line" aria-label="Kind">
        {[{ key: "all", plural: "All" }, ...POST_KINDS].map((x) => (
          <Link key={x.key} href={`/community/${x.key === "all" ? "all" : x.key}`} className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 text-[14.5px] font-medium", k === x.key ? "border-[var(--text)] text-[var(--text)]" : "border-transparent text-2 hover:text-[var(--text)]")}>
            {x.plural}
            <span className="text-[12px] font-normal tabular text-3">{x.key === "all" ? total_all : counts[x.key] ?? 0}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px]">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-3">Sort</span>
          <Link href={qs({ sort: undefined, page: undefined })} className={cn("px-1.5 py-0.5", sort !== "top" ? "font-semibold underline underline-offset-4" : "text-2 hover:text-[var(--text)]")}>Newest</Link>
          <Link href={qs({ sort: "top", page: undefined })} className={cn("px-1.5 py-0.5", sort === "top" ? "font-semibold underline underline-offset-4" : "text-2 hover:text-[var(--text)]")}>Most liked</Link>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-3">City</span>
          <Link href={qs({ city: undefined, page: undefined })} className={cn("px-1.5 py-0.5", !city ? "font-semibold underline underline-offset-4" : "text-2 hover:text-[var(--text)]")}>Anywhere</Link>
          {cities.map((c) => (
            <Link key={c.id} href={qs({ city: c.slug, page: undefined })} className={cn("px-1.5 py-0.5", city === c.slug ? "font-semibold underline underline-offset-4" : "text-2 hover:text-[var(--text)]")}>
              {c.name}
            </Link>
          ))}
        </div>
      </div>
      {topics.length ? (
        <p className="mt-2 flex flex-wrap items-center gap-1 text-[13.5px]">
          <span className="mr-1 text-3">Topic</span>
          {topic ? <Link href={qs({ topic: undefined, page: undefined })} className="px-1.5 py-0.5 font-semibold underline underline-offset-4">{topic} ×</Link> : null}
          {topics.filter((t) => t.topic !== topic).map((t) => (
            <Link key={t.topic} href={qs({ topic: t.topic, page: undefined })} className="px-1.5 py-0.5 text-2 hover:text-[var(--text)]">
              {t.topic} <span className="text-[12px] text-3">{t.n}</span>
            </Link>
          ))}
        </p>
      ) : null}

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {rows.length ? (
            <div>
              {rows.map((p) => (
                <PostCard key={p.id} p={p} showKind={k === "all"} />
              ))}
            </div>
          ) : (
            <div className="border-y border-line py-12 text-center text-[15px] text-2">
              <p>Nothing here yet.</p>
              <p className="mt-2">
                <Link href="/community/new" className="underline underline-offset-4">
                  Be the first to post
                </Link>
                .
              </p>
            </div>
          )}
          {total > limit ? (
            <nav className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
              {pageNum > 1 ? <Link href={qs({ page: String(pageNum - 1) })} className="underline-offset-4 hover:underline">← Previous</Link> : <span />}
              <span className="text-3">Page {pageNum} of {Math.ceil(total / limit)}</span>
              {pageNum * limit < total ? <Link href={qs({ page: String(pageNum + 1) })} className="underline-offset-4 hover:underline">Next →</Link> : <span />}
            </nav>
          ) : null}
        </div>
        <aside className="space-y-8 self-start text-[14.5px] lg:sticky lg:top-24">
          <div className="border-y-2 border-[var(--rule)] py-4">
            <p className="font-display text-xl ">Post something</p>
            <p className="mt-1 text-2">A job, something to sell, an auction, a question. Free. Checked by an editor before it goes up.</p>
            <Link href="/community/new" className="mt-3 inline-flex h-10 items-center bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800">
              New post
            </Link>
          </div>
          <div className="text-2">
            <p className="font-medium text-[var(--text)]">House rules</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Real names, real things. Scams and duplicates are removed and the account closed.</li>
              <li>Verified means the poster is a verified member, business or professional.</li>
              <li>Deal in person, pay on delivery, never send an advance to a stranger.</li>
              <li>See something wrong? Use Report on the post.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
