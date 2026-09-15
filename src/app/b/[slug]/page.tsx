import { BadgeCheck, ExternalLink, Globe, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessCard, OpenNow, PriceRange, Rating } from "@/components/cards";
import { Badge, Breadcrumbs, JsonLd } from "@/components/ui";
import { entitiesForTarget } from "@/db/queries/entities";
import { getBusiness, listBusinesses } from "@/db/queries/directory";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, localBusinessJsonLd } from "@/lib/seo";
import { Img } from "@/components/img";
import { LeadForm } from "./lead-form";
import { MapEmbed } from "@/components/directory/map-embed";
import { TrackedLink } from "@/components/directory/tracked-link";
import { ReportForm } from "@/components/report-form";
import { ReviewForm } from "@/components/directory/review-form";

export const revalidate = 3600;
type Props = { params: Promise<{ slug: string }> };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const b = await getBusiness(slug);
  if (!b || b.status !== "active") return {};
  return buildMetadata({
    title: `${b.name}${b.city ? `: ${b.primaryCategory?.name ?? "Business"} in ${b.city.name}` : ""}`,
    description: b.tagline ?? b.description ?? `${b.name}: address, phone, WhatsApp, opening hours and reviews.`,
    path: `/b/${b.slug}`,
    image: b.coverUrl ?? b.logoUrl,
  });
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params;
  const b = await getBusiness(slug);
  if (!b || b.status !== "active") notFound();
  const [nearby, entities] = await Promise.all([
    b.primaryCategoryId && b.cityId ? listBusinesses({ categoryId: b.primaryCategoryId, cityId: b.cityId, limit: 4 }) : Promise.resolve([]),
    entitiesForTarget("business", b.id),
  ]);
  const similar = nearby.filter((n) => n.id !== b.id).slice(0, 3);
  const path = `/b/${b.slug}`;
  const crumbs = [
    { name: "Businesses", path: "/businesses" },
    ...(b.primaryCategory ? [{ name: b.primaryCategory.namePlural ?? b.primaryCategory.name, path: `/businesses/${b.primaryCategory.slug}` }] : []),
    ...(b.primaryCategory && b.city ? [{ name: b.city.name, path: `/businesses/${b.primaryCategory.slug}/${b.city.slug}` }] : []),
    { name: b.name, path },
  ];
  const wa = b.whatsapp ? `https://wa.me/${b.whatsapp.replace(/\D/g, "").replace(/^0/, "92")}` : null;
  const maps = b.lat && b.lng ? `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}` : b.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.address}, ${b.city?.name ?? ""}`)}` : null;

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd
        data={[
          localBusinessJsonLd({ name: b.name, description: b.description, path, phone: b.phone, address: b.address, city: b.city?.name, lat: b.lat, lng: b.lng, image: b.coverUrl ?? b.logoUrl, ratingAvg: b.ratingAvg, ratingCount: b.ratingCount, priceRange: b.priceRange }),
          breadcrumbJsonLd(crumbs),
        ]}
      />
      <Breadcrumbs items={crumbs.slice(0, -1)} />

      {b.coverUrl ? <Img src={b.coverUrl} alt="" aspect="21/9" className="mt-6" priority sizes="(min-width: 1024px) 1100px, 100vw" /> : null}

      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {b.logoUrl ? <Img src={b.logoUrl} alt={`${b.name} logo`} aspect="1/1" fit="contain" className="size-20 shrink-0 border border-line" sizes="80px" /> : null}
        <div className="max-w-3xl flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {b.primaryCategory ? (
              <Link href={`/businesses/${b.primaryCategory.slug}${b.city ? `/${b.city.slug}` : ""}`}>
                <Badge tone="brand">{b.primaryCategory.name}</Badge>
              </Link>
            ) : null}
            {b.isVerified ? (
              <Badge tone="success">
                <BadgeCheck className="mr-1 size-3.5" /> Verified{b.lastVerifiedAt ? ` · ${formatDate(b.lastVerifiedAt)}` : ""}
              </Badge>
            ) : (
              <Badge>Unverified listing</Badge>
            )}
            {b.tier === "premium" || b.tier === "sponsored" ? <Badge tone="accent">{b.tier === "sponsored" ? "Sponsored" : "Premium"}</Badge> : null}
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{b.name}</h1>
          {b.tagline ? <p className="mt-2 text-lg text-2">{b.tagline}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[15px]">
            <Rating avg={b.ratingAvg} count={b.ratingCount} />
            {b.priceRange ? <PriceRange level={b.priceRange} /> : null}
            {b.hours.length ? <OpenNow hours={b.hours} /> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          {b.phone ? (
            <TrackedLink businessId={b.id} kind="call" href={`tel:${b.phone}`} className="inline-flex h-10 items-center gap-2 border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2">
              <Phone className="size-4" /> {b.phone}
            </TrackedLink>
          ) : null}
          {wa ? (
            <TrackedLink businessId={b.id} kind="whatsapp" href={wa} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 bg-brand-700 px-4 text-sm font-medium text-white hover:bg-brand-800">
              WhatsApp
            </TrackedLink>
          ) : null}
        </div>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-10">
          {b.description ? (
            <section>
              <h2 className="text-xl font-semibold">About</h2>
              <p className="mt-2 max-w-[68ch] text-[17px] leading-relaxed text-2">{b.description}</p>
            </section>
          ) : null}

          {b.photos.length ? (
            <section>
              <h2 className="text-xl font-semibold">Photos</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {b.photos.map((p, i) => (
                  <Img key={p.id} src={p.url} alt={p.alt ?? `${b.name} photo ${i + 1}`} aspect="4/3" sizes="(min-width: 1024px) 300px, 50vw" />
                ))}
              </div>
            </section>
          ) : null}

          {b.services.length ? (
            <section>
              <h2 className="text-xl font-semibold">Services</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {b.services.map((s) => (
                  <li key={s.id} className="surface px-4 py-3 text-[15px]">
                    <span className="font-medium">{s.name}</span>
                    {s.description ? <span className="block text-sm text-2">{s.description}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section id="write-review">
            <h2 className="text-xl font-semibold">Reviews</h2>
            {b.reviews.length ? (
              <ul className="mt-3 space-y-3">
                {b.reviews.map((r) => (
                  <li key={r.id} className="surface p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{r.authorName ?? "Anonymous"}</span>
                      <span className="text-sm text-3">{formatDate(r.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-accent-700">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                    {r.title ? <p className="mt-2 font-medium">{r.title}</p> : null}
                    {r.body ? <p className="mt-1 text-[15px] text-2">{r.body}</p> : null}
                    {r.ownerResponse ? (
                      <div className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-[15px]">
                        <p className="text-xs font-semibold uppercase tracking-wider text-3">Response from the business</p>
                        <p className="mt-1 text-2">{r.ownerResponse}</p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-2">No reviews yet. Be the first: reviews are checked before they appear and are never paid for.</p>
            )}
            <div className="mt-5 surface p-5">
              <h3 className="font-semibold">Write a review</h3>
              <div className="mt-3">
                <ReviewForm businessId={b.id} businessSlug={b.slug} />
              </div>
            </div>
          </section>

          {entities.length ? (
            <section className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-3">Related topics:</span>
              {entities.map((e) => (
                <Link key={e.id} href={`/e/${e.slug}`} className="border border-line px-2.5 py-1 text-2 hover:bg-surface-2 hover:text-[var(--text)]">
                  {e.name}
                </Link>
              ))}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          {b.lat != null && b.lng != null ? <MapEmbed lat={b.lat} lng={b.lng} name={b.name} /> : null}
          <div className="surface p-5 space-y-3 text-[15px]">
            {b.address ? (
              <p className="flex gap-2.5">
                <MapPin className="mt-1 size-4 shrink-0 text-3" />
                <span>
                  {b.address}
                  {b.area && b.city ? (
                    <span className="block text-2">
                      <Link href={`/cities/${b.city.slug}/${b.area.slug}`} className="underline-offset-4 hover:underline">{b.area.name}</Link>, <Link href={`/cities/${b.city.slug}`} className="underline-offset-4 hover:underline">{b.city.name}</Link>
                    </span>
                  ) : b.city ? (
                    <span className="block text-2"><Link href={`/cities/${b.city.slug}`} className="underline-offset-4 hover:underline">{b.city.name}</Link></span>
                  ) : null}
                  {maps ? (
                    <TrackedLink businessId={b.id} kind="directions" href={maps} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-700 dark:text-brand-300">
                      Directions <ExternalLink className="size-3" />
                    </TrackedLink>
                  ) : null}
                </span>
              </p>
            ) : null}
            {b.website ? (
              <p className="flex gap-2.5">
                <Globe className="mt-1 size-4 shrink-0 text-3" />
                <TrackedLink businessId={b.id} kind="website" href={b.website} target="_blank" rel={b.tier === "free" ? "noopener nofollow" : "noopener"} className="truncate text-brand-700 dark:text-brand-300 hover:underline">
                  {b.website.replace(/^https?:\/\//, "")}
                </TrackedLink>
              </p>
            ) : null}
            {b.hours.length ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-3">Hours</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
                  {b.hours.map((h) => (
                    <div key={h.id} className="contents">
                      <dt className="text-2">{DAYS[h.dayOfWeek]}</dt>
                      <dd className="tabular text-right">{h.isClosed || !h.opens ? "Closed" : h.opens === "00:00" && h.closes === "23:59" ? "Open 24 hours" : `${h.opens} – ${h.closes}`}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
          <div className="surface p-5">
            <p className="font-semibold">Send an enquiry</p>
            <p className="mt-1 text-sm text-2">Goes straight to the business. We never share your details elsewhere.</p>
            <div className="mt-3">
              <LeadForm businessId={b.id} />
            </div>
          </div>
          <p className="px-1 text-xs text-3">
            Is this your business? <Link href={`/claim/${b.slug}`} className="text-brand-700 dark:text-brand-300 underline">Claim it</Link> to update details and respond to reviews.
          </p>
          <div className="px-1">
            <ReportForm targetType="business" targetId={b.id} label="Report wrong details or a closed business" />
          </div>
        </aside>
      </div>

      {similar.length ? (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-semibold">More {b.primaryCategory?.namePlural?.toLowerCase() ?? "businesses"} in {b.city?.name}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {similar.map((s) => (
              <BusinessCard key={s.id} business={s} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
