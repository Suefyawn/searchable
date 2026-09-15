import { BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/community/post-card";
import { ReportButton } from "@/components/community/report-button";
import { JsonLd } from "@/components/ui";
import { getProfession } from "@/content/professions";
import { getMemberByHandle, listPosts, memberLinks } from "@/lib/community";
import { srcSetFor } from "@/lib/images";
import { formatDate } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";

export const revalidate = 600;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const m = await getMemberByHandle(handle);
  if (!m || !m.isPublic || m.isBanned) return { title: "Member" };
  return buildMetadata({ title: `${m.displayName} (@${m.handle})`, description: m.bio ?? `${m.displayName} on ${SITE.name}: posts, comments and profiles.`, path: `/u/${m.handle}`, image: m.avatarUrl ?? undefined, type: "profile", noindex: m.postCount === 0 });
}

export default async function MemberPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const m = await getMemberByHandle(handle);
  if (!m || !m.isPublic || m.isBanned) notFound();
  const [{ rows: posts }, links] = await Promise.all([listPosts({ authorId: m.userId, limit: 20 }), memberLinks(m.userId)]);
  const social = Object.entries(m.social).filter(([, v]) => v) as [string, string][];
  const jsonLd = { "@context": "https://schema.org", "@type": "Person", name: m.displayName, url: `${SITE.url}/u/${m.handle}`, description: m.bio ?? undefined, image: m.avatarUrl ?? undefined, sameAs: social.map(([k, v]) => (/^https?:\/\//i.test(v) ? v : k === "website" ? `https://${v}` : `https://${k === "x" ? "x.com" : `${k}.com`}/${v.replace(/^@/, "")}`)) };

  return (
    <div className="container-x py-8 sm:py-10">
      <JsonLd data={jsonLd} />
      <header className="flex flex-col gap-5 border-b-2 border-[var(--rule)] pb-6 sm:flex-row sm:items-start">
        <div className="size-24 shrink-0 overflow-hidden bg-surface-2">
          {m.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.avatarUrl} srcSet={srcSetFor(m.avatarUrl)} sizes="96px" alt={m.displayName} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center font-serif text-4xl text-3">{m.displayName.slice(0, 1)}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Member{m.city ? ` · ${m.city.name}` : ""}</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-x-3 font-serif text-3xl font-medium leading-tight">
            {m.displayName}
            {m.isVerified ? (
              <span className="inline-flex items-center gap-1 border border-line px-2 py-0.5 font-sans text-[11px] font-bold uppercase tracking-[0.1em]">
                <BadgeCheck className="size-3.5" /> Verified
              </span>
            ) : null}
          </h1>
          <p className="mt-1 text-[14px] text-3">
            @{m.handle} · joined {formatDate(m.createdAt, { month: "long", year: "numeric" })} · {m.postCount} posts · {m.commentCount} comments · {m.likesReceived} likes
          </p>
          {m.bio ? <p className="mt-3 max-w-[60ch] text-[15px] text-2">{m.bio}</p> : null}
          {social.length ? (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
              {social.map(([k, v]) => (
                <li key={k}>
                  <a href={/^https?:\/\//i.test(v) ? v : k === "website" ? `https://${v}` : `https://${k === "x" ? "x.com" : `${k}.com`}/${v.replace(/^@/, "")}`} target="_blank" rel="noopener nofollow" className="underline-offset-4 hover:underline">
                    {k === "x" ? "X" : k[0].toUpperCase() + k.slice(1)}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {links.businesses.length || links.pros.length ? (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
              {links.pros.map((p) => (
                <li key={p.slug}>
                  <Link href={`/p/${p.slug}`} className="underline underline-offset-4">
                    {getProfession(p.professionSlug)?.name ?? "Professional"} profile{p.isVerified ? " (verified)" : ""}
                  </Link>
                </li>
              ))}
              {links.businesses.map((b) => (
                <li key={b.slug}>
                  <Link href={`/b/${b.slug}`} className="underline underline-offset-4">
                    {b.name}
                    {b.isVerified ? " (verified)" : ""}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3">
            <ReportButton targetType="member" targetId={m.userId} />
          </div>
        </div>
      </header>
      <section className="mt-8">
        <h2 className="eyebrow border-b-2 border-[var(--rule)] pb-1.5">Posts</h2>
        {posts.length ? posts.map((p) => <PostCard key={p.id} p={p} />) : <p className="py-6 text-[14.5px] text-3">No posts yet.</p>}
      </section>
    </div>
  );
}
