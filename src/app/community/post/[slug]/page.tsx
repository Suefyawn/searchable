import { BadgeCheck, ExternalLink, Mail, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsSection } from "@/components/community/comments";
import { LikeButton } from "@/components/community/like-button";
import { LikedProvider } from "@/components/community/liked-context";
import { PostCard, postFigure } from "@/components/community/post-card";
import { ReportButton } from "@/components/community/report-button";
import { SaveButton } from "@/components/saved/save-button";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { getPost, kindLabel, listPosts, memberHandles } from "@/lib/community";
import { srcSetFor } from "@/lib/images";
import { formatDate, pkr, timeAgo } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";
import { BidForm } from "./bid-form";

export const revalidate = 300;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}

function auctionEnded(endsAt?: string) {
  return !!endsAt && Date.parse(endsAt) < Date.now();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p || (p.status !== "published" && p.status !== "closed")) return { title: "Post" };
  const figure = postFigure(p as Parameters<typeof postFigure>[0]);
  return buildMetadata({
    title: p.title,
    description: `${kindLabel(p.kind)}${figure ? ` · ${figure}` : ""}${p.city ? ` · ${p.city.name}` : ""}. ${p.body.replace(/\s+/g, " ").slice(0, 150)}`,
    path: `/community/post/${p.slug}`,
    kicker: kindLabel(p.kind),
    image: p.images[0]?.url,
    type: "article",
    publishedTime: p.publishedAt,
    noindex: p.status === "closed",
  });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p || (p.status !== "published" && p.status !== "closed")) notFound();
  const path = `/community/post/${p.slug}`;
  const [handles, related] = await Promise.all([memberHandles([p.authorId]), listPosts({ kind: p.kind, limit: 4 })]);
  const handle = handles.get(p.authorId);
  const m = p.meta;
  const figure = postFigure(p as Parameters<typeof postFigure>[0]);
  const crumbs = [
    { name: "Community", path: "/community" },
    { name: kindLabel(p.kind, true), path: `/community/${p.kind}` },
    { name: p.title, path },
  ];
  const auctionOpen = p.kind === "auction" && p.status === "published" && !auctionEnded(m.endsAt);
  const nextBid = (p.highestBid ?? (m.startPrice ?? 0) - (m.minIncrement ?? 1)) + (m.minIncrement ?? 1);
  const jsonLd =
    p.kind === "job"
      ? { "@context": "https://schema.org", "@type": "JobPosting", title: p.title, description: p.body.slice(0, 2000), datePosted: p.publishedAt?.toISOString(), validThrough: m.deadline, employmentType: m.employmentType?.toUpperCase(), hiringOrganization: m.company ? { "@type": "Organization", name: m.company } : undefined, jobLocation: p.city ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: p.city.name, addressCountry: "PK" } } : undefined, baseSalary: m.salaryMin || m.salaryMax ? { "@type": "MonetaryAmount", currency: "PKR", value: { "@type": "QuantitativeValue", minValue: m.salaryMin, maxValue: m.salaryMax, unitText: "MONTH" } } : undefined }
      : p.kind === "listing" || p.kind === "auction"
        ? { "@context": "https://schema.org", "@type": "Product", name: p.title, description: p.body.slice(0, 2000), image: p.images.map((i) => i.url), offers: { "@type": "Offer", priceCurrency: "PKR", price: p.kind === "auction" ? p.highestBid ?? m.startPrice : m.price, availability: p.status === "closed" ? "https://schema.org/SoldOut" : "https://schema.org/InStock", itemCondition: m.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition" } }
        : { "@context": "https://schema.org", "@type": "DiscussionForumPosting", headline: p.title, text: p.body.slice(0, 2000), datePublished: p.publishedAt?.toISOString(), author: { "@type": "Person", name: p.author.name, url: handle ? `${SITE.url}/u/${handle}` : undefined }, interactionStatistic: [{ "@type": "InteractionCounter", interactionType: "https://schema.org/CommentAction", userInteractionCount: p.commentCount }, { "@type": "InteractionCounter", interactionType: "https://schema.org/LikeAction", userInteractionCount: p.likeCount }] };

  return (
    <div className="container-x py-8 sm:py-10">
      <JsonLd data={[jsonLd, breadcrumbJsonLd(crumbs)]} />
      <Breadcrumbs items={crumbs.slice(0, 2)} className="mb-6" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-3">
            <Link href={`/community/${p.kind}`} className="hover:text-[var(--text)]">
              {kindLabel(p.kind)}
            </Link>
            {p.isVerified ? (
              <span className="inline-flex items-center gap-1 text-[var(--text)]">
                <BadgeCheck className="size-3.5" /> Verified poster
              </span>
            ) : null}
            {p.status === "closed" ? <span>Closed</span> : null}
            {p.topic ? <span>{p.topic}</span> : null}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{p.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 text-[13.5px] text-2">
            {handle ? (
              <Link href={`/u/${handle}`} className="font-medium text-[var(--text)] underline-offset-4 hover:underline">
                {p.author.name}
              </Link>
            ) : (
              <span className="font-medium text-[var(--text)]">{p.author.name}</span>
            )}
            <time dateTime={(p.publishedAt ?? p.createdAt).toISOString()}>{timeAgo(p.publishedAt ?? p.createdAt)}</time>
            {p.city ? <Link href={`/community/${p.kind}?city=${p.city.slug}`} className="underline-offset-4 hover:underline">{p.city.name}</Link> : null}
            {m.location ? <span>{m.location}</span> : null}
          </p>

          {p.images.length ? (
            <div className={`mt-6 grid gap-2 ${p.images.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {p.images.map((im, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={im.url} src={im.url} srcSet={srcSetFor(im.url)} sizes="(min-width: 1024px) 640px, 100vw" alt={im.alt ?? `${p.title}, photo ${i + 1}`} loading={i ? "lazy" : "eager"} className="w-full bg-surface-2 object-cover" style={{ aspectRatio: "4/3" }} />
              ))}
            </div>
          ) : null}

          <div className="prose mt-6 max-w-[70ch] text-[16px] leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />

          <LikedProvider targets={[{ type: "post", id: p.id }]}>
            <div className="mt-6 flex flex-wrap items-center gap-5 border-y border-line py-3">
              <LikeButton type="post" id={p.id} count={p.likeCount} path={path} />
              <a href="#comments" className="inline-flex items-center gap-1.5 text-[13.5px] text-2 hover:text-[var(--text)]">
                <MessageCircle className="size-4" /> {p.commentCount} comments
              </a>
              <SaveButton target={{ targetType: "post", targetId: p.id, title: p.title, url: path }} />
              <ReportButton targetType="post" targetId={p.id} />
            </div>
          </LikedProvider>

          <CommentsSection targetType="post" targetId={p.id} path={path} />
        </article>

        <aside className="space-y-6 self-start lg:sticky lg:top-24">
          <div className="border-y-2 border-[var(--rule)] py-4">
            {figure ? <p className="font-display text-3xl tabular">{figure}</p> : null}
            {p.kind === "job" ? (
              <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[14px]">
                {m.company ? (
                  <>
                    <dt className="text-3">Employer</dt>
                    <dd>{m.company}</dd>
                  </>
                ) : null}
                {m.employmentType ? (
                  <>
                    <dt className="text-3">Type</dt>
                    <dd className="capitalize">{m.employmentType.replace("_", " ")}</dd>
                  </>
                ) : null}
                {m.deadline ? (
                  <>
                    <dt className="text-3">Apply by</dt>
                    <dd>{formatDate(m.deadline)}</dd>
                  </>
                ) : null}
              </dl>
            ) : null}
            {p.kind === "listing" ? <p className="mt-1 text-[14px] text-2">{[m.condition ? (m.condition === "new" ? "New" : "Used") : null, m.negotiable ? "Negotiable" : null, p.expiresAt ? `Listed until ${formatDate(p.expiresAt)}` : null].filter(Boolean).join(" · ")}</p> : null}
            {p.kind === "auction" ? (
              <div className="mt-2 space-y-3 text-[14px]">
                <p className="text-2">
                  {p.bidCount} bid{p.bidCount === 1 ? "" : "s"} · starts at {pkr(m.startPrice ?? 0)} · steps of {pkr(m.minIncrement ?? 1)}
                  {m.endsAt ? ` · ${auctionOpen ? "ends" : "ended"} ${formatDate(m.endsAt, { dateStyle: "medium", timeStyle: "short" })}` : ""}
                </p>
                {auctionOpen ? <BidForm postId={p.id} minimum={nextBid} path={path} /> : <p className="font-medium">Bidding has closed.</p>}
                {p.bids.length ? (
                  <ol className="divide-y divide-[var(--border)] text-[13.5px]">
                    {p.bids.map((b) => (
                      <li key={b.id} className="flex justify-between py-1.5">
                        <span className="text-2">{b.user.name}</span>
                        <span className="tabular">
                          {pkr(b.amount)} <span className="text-3">{timeAgo(b.createdAt)}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ) : null}
            {p.kind !== "question" && p.kind !== "discussion" && p.status === "published" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {m.contactPhone ? (
                  <a href={`tel:${m.contactPhone}`} className="inline-flex h-10 items-center gap-2 bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800">
                    <Phone className="size-4" /> {m.contactPhone}
                  </a>
                ) : null}
                {m.contactWhatsapp ? (
                  <a href={`https://wa.me/${m.contactWhatsapp.replace(/\D/g, "").replace(/^0/, "92")}`} target="_blank" rel="noopener nofollow" className="inline-flex h-10 items-center gap-2 border border-line px-4 text-sm font-medium hover:bg-surface-2">
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                ) : null}
                {m.contactEmail ? (
                  <a href={`mailto:${m.contactEmail}`} className="inline-flex h-10 items-center gap-2 border border-line px-4 text-sm font-medium hover:bg-surface-2">
                    <Mail className="size-4" /> Email
                  </a>
                ) : null}
                {m.applyUrl ? (
                  <a href={m.applyUrl} target="_blank" rel="noopener nofollow" className="inline-flex h-10 items-center gap-2 border border-line px-4 text-sm font-medium hover:bg-surface-2">
                    <ExternalLink className="size-4" /> Apply
                  </a>
                ) : null}
              </div>
            ) : null}
            {p.kind === "listing" || p.kind === "auction" ? <p className="mt-3 text-[12.5px] text-3">Meet in a public place, inspect before paying, never send an advance to someone you have not met. Searchable is not party to the sale.</p> : null}
          </div>
          {related.rows.filter((r) => r.id !== p.id).length ? (
            <div>
              <p className="eyebrow">More {kindLabel(p.kind, true).toLowerCase()}</p>
              {related.rows
                .filter((r) => r.id !== p.id)
                .slice(0, 3)
                .map((r) => (
                  <PostCard key={r.id} p={r} showKind={false} className="py-3" />
                ))}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
