import { BadgeCheck, ExternalLink, FileText, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Rating } from "@/components/cards";
import { CiteThis } from "@/components/cite";
import { Breadcrumbs, JsonLd } from "@/components/ui";
import { getProfession } from "@/content/professions";
import { srcSetFor } from "@/lib/images";
import { formatDate, pkr } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { getProfessional, listProfessionals } from "@/lib/professionals";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";
import { ProCard } from "@/components/professionals/pro-card";
import { ReviewForm } from "@/components/directory/review-form";
import { ProLeadForm } from "./lead-form";

export const revalidate = 3600;

const SOCIAL: { key: keyof NonNullable<Awaited<ReturnType<typeof getProfessional>>>["social"]; label: string; base: string }[] = [
  { key: "linkedin", label: "LinkedIn", base: "https://www.linkedin.com/in/" },
  { key: "x", label: "X", base: "https://x.com/" },
  { key: "instagram", label: "Instagram", base: "https://instagram.com/" },
  { key: "facebook", label: "Facebook", base: "https://facebook.com/" },
  { key: "github", label: "GitHub", base: "https://github.com/" },
  { key: "youtube", label: "YouTube", base: "https://youtube.com/@" },
  { key: "tiktok", label: "TikTok", base: "https://tiktok.com/@" },
  { key: "behance", label: "Behance", base: "https://behance.net/" },
];
function socialUrl(base: string, v: string) {
  return /^https?:\/\//i.test(v) ? v : `${base}${v.replace(/^@/, "")}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProfessional(slug);
  if (!p || p.status !== "active") return { title: "Profile" };
  const prof = getProfession(p.professionSlug);
  return buildMetadata({
    title: `${p.name}, ${prof?.name ?? "Professional"}${p.city ? ` in ${p.city.name}` : ""}`,
    description: p.headline ?? `${p.name} is a ${prof?.name.toLowerCase() ?? "professional"}${p.city ? ` in ${p.city.name}` : ""}. Contact details, experience, services and fees on ${SITE.name}.`,
    path: `/p/${p.slug}`,
    kicker: prof?.name,
    image: p.photoUrl ?? undefined,
    type: "profile",
  });
}

export default async function ProfessionalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProfessional(slug);
  if (!p || p.status !== "active") notFound();
  const prof = getProfession(p.professionSlug);
  const similar = (await listProfessionals({ profession: p.professionSlug, citySlug: p.city?.slug, limit: 4 })).rows.filter((s) => s.id !== p.id).slice(0, 3);
  const crumbs = [
    { name: "Professionals", path: "/professionals" },
    { name: prof?.plural ?? p.professionSlug, path: `/professionals/${p.professionSlug}` },
    ...(p.city ? [{ name: p.city.name, path: `/professionals/${p.professionSlug}/${p.city.slug}` }] : []),
    { name: p.name, path: `/p/${p.slug}` },
  ];
  const sameAs = SOCIAL.map((s) => (p.social[s.key] ? socialUrl(s.base, p.social[s.key]!) : null)).filter(Boolean);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    url: `${SITE.url}/p/${p.slug}`,
    jobTitle: prof?.name,
    description: p.headline ?? undefined,
    image: p.photoUrl ?? undefined,
    telephone: p.phone ?? undefined,
    email: p.showEmail && p.email ? p.email : undefined,
    address: p.city ? { "@type": "PostalAddress", addressLocality: p.city.name, addressCountry: "PK" } : undefined,
    knowsLanguage: p.languages.length ? p.languages : undefined,
    knowsAbout: p.skills.length ? p.skills : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    worksFor: p.experience[0]?.org ? { "@type": "Organization", name: p.experience[0].org } : undefined,
    alumniOf: p.education.map((e) => (e.institution ? { "@type": "EducationalOrganization", name: e.institution } : null)).filter(Boolean),
    hasCredential: [...(p.licenceNo && prof?.licence ? [{ "@type": "EducationalOccupationalCredential", name: `${prof.licence.body} registration`, identifier: p.licenceNo }] : []), ...p.certifications.map((c) => ({ "@type": "EducationalOccupationalCredential", name: c.name, recognizedBy: c.issuer ? { "@type": "Organization", name: c.issuer } : undefined }))],
    aggregateRating: p.ratingCount ? { "@type": "AggregateRating", ratingValue: p.ratingAvg, reviewCount: p.ratingCount } : undefined,
  };

  return (
    <div className="container-x py-8 sm:py-10">
      <JsonLd data={[jsonLd, breadcrumbJsonLd(crumbs)]} />
      <Breadcrumbs items={crumbs} className="mb-6" />

      <header className="flex flex-col gap-5 border-b-2 border-[var(--rule)] pb-6 sm:flex-row sm:items-start">
        <div className="size-28 shrink-0 overflow-hidden bg-surface-2 sm:size-36">
          {p.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.photoUrl} srcSet={srcSetFor(p.photoUrl)} sizes="144px" alt={p.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center font-serif text-5xl text-3">{p.name.slice(0, 1)}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{prof?.name ?? "Professional"}{p.city ? ` · ${p.city.name}` : ""}</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-x-3 font-serif text-3xl font-medium leading-tight sm:text-4xl">
            {p.name}
            {p.isVerified ? (
              <span className="inline-flex items-center gap-1 border border-line px-2 py-0.5 font-sans text-[11px] font-bold uppercase tracking-[0.1em]">
                <BadgeCheck className="size-3.5" /> Verified{p.verifiedAt ? ` · ${formatDate(p.verifiedAt, { month: "short", year: "numeric" })}` : ""}
              </span>
            ) : null}
          </h1>
          {p.headline ? <p className="mt-2 text-lg text-2">{p.headline}</p> : null}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-3">
            {p.yearsExperience ? <span>{p.yearsExperience} years experience</span> : null}
            {p.serviceMode ? <span>{p.serviceMode === "both" ? "In person and online" : p.serviceMode === "online" ? "Online only" : "In person"}</span> : null}
            {p.languages.length ? <span>{p.languages.join(", ")}</span> : null}
            {p.ratingCount ? <Rating avg={p.ratingAvg} count={p.ratingCount} /> : null}
            {p.licenceNo && prof?.licence ? (
              <span>
                {prof.licence.body} {p.licenceNo}
              </span>
            ) : null}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {p.phone ? (
              <a href={`tel:${p.phone}`} className="inline-flex h-10 items-center gap-2 bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800">
                <Phone className="size-4" /> {p.phone}
              </a>
            ) : null}
            {p.whatsapp ? (
              <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, "").replace(/^0/, "92")}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 border border-line px-4 text-sm font-medium hover:bg-surface-2">
                <MessageCircle className="size-4" /> WhatsApp
              </a>
            ) : null}
            {p.showEmail && p.email ? (
              <a href={`mailto:${p.email}`} className="inline-flex h-10 items-center gap-2 border border-line px-4 text-sm font-medium hover:bg-surface-2">
                <Mail className="size-4" /> Email
              </a>
            ) : null}
            {p.website ? (
              <a href={p.website} target="_blank" rel={p.isVerified ? "noopener" : "noopener nofollow"} className="inline-flex h-10 items-center gap-2 border border-line px-4 text-sm font-medium hover:bg-surface-2">
                <Globe className="size-4" /> {p.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            ) : null}
            {p.cvUrl && p.cvPublic ? (
              <a href={p.cvUrl} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 border border-line px-4 text-sm font-medium hover:bg-surface-2">
                <FileText className="size-4" /> CV (PDF)
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          {p.bio ? (
            <section>
              <h2 className="eyebrow mb-3">About</h2>
              <div className="prose max-w-[70ch] text-[16px] leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.bio) }} />
            </section>
          ) : null}
          {p.services.length ? (
            <section>
              <h2 className="eyebrow mb-3">Services and fees</h2>
              <ul className="divide-y divide-[var(--border)] border-y border-line">
                {p.services.map((s, i) => (
                  <li key={`${s.name}-${i}`} className="flex items-baseline justify-between gap-4 py-2.5 text-[15px]">
                    <span>{s.name}</span>
                    {s.priceFrom ? (
                      <span className="shrink-0 tabular text-2">
                        from {pkr(s.priceFrom)}
                        {s.unit ? ` / ${s.unit}` : ""}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {p.rateFrom && !p.services.some((s) => s.priceFrom) ? (
                <p className="mt-2 text-[14px] text-2">
                  Typical fee from {pkr(p.rateFrom)}
                  {p.rateUnit ? ` per ${p.rateUnit}` : ""}.
                </p>
              ) : null}
            </section>
          ) : p.rateFrom ? (
            <section>
              <h2 className="eyebrow mb-2">Fees</h2>
              <p className="text-[15px]">
                From {pkr(p.rateFrom)}
                {p.rateUnit ? ` per ${p.rateUnit}` : ""}.
              </p>
            </section>
          ) : null}
          {p.experience.length ? (
            <section>
              <h2 className="eyebrow mb-3">Experience</h2>
              <ol className="space-y-4 border-l border-line pl-5">
                {p.experience.map((e, i) => (
                  <li key={`${e.title}-${i}`} className="relative">
                    <span className="absolute -left-[23px] top-2 size-2 bg-ink-900" aria-hidden />
                    <p className="font-medium">
                      {e.title}
                      {e.org ? <span className="font-normal text-2"> · {e.org}</span> : null}
                    </p>
                    {e.from || e.to ? (
                      <p className="text-[13px] text-3">
                        {e.from ?? ""}
                        {e.from || e.to ? " to " : ""}
                        {e.to ?? "present"}
                      </p>
                    ) : null}
                    {e.description ? <p className="mt-1 text-[14.5px] text-2">{e.description}</p> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {p.education.length || p.certifications.length ? (
            <section className="grid gap-8 sm:grid-cols-2">
              {p.education.length ? (
                <div>
                  <h2 className="eyebrow mb-3">Education</h2>
                  <ul className="space-y-2 text-[15px]">
                    {p.education.map((e, i) => (
                      <li key={`${e.degree}-${i}`}>
                        <p className="font-medium">{e.degree}</p>
                        <p className="text-[13.5px] text-2">{[e.institution, e.year].filter(Boolean).join(" · ")}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {p.certifications.length ? (
                <div>
                  <h2 className="eyebrow mb-3">Certifications and licences</h2>
                  <ul className="space-y-2 text-[15px]">
                    {p.certifications.map((c, i) => (
                      <li key={`${c.name}-${i}`}>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-[13.5px] text-2">{[c.issuer, c.year, c.number ? `No. ${c.number}` : null].filter(Boolean).join(" · ")}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
          {p.skills.length ? (
            <section>
              <h2 className="eyebrow mb-3">Skills</h2>
              <ul className="flex flex-wrap gap-2">
                {p.skills.map((s) => (
                  <li key={s} className="border border-line px-2.5 py-1 text-[13.5px]">
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section id="write-review">
            <h2 className="eyebrow mb-3">
              Reviews <span className="ml-1 font-sans text-[12px] font-normal normal-case tracking-normal text-3">{p.reviews.length}</span>
            </h2>
            {p.reviews.length ? (
              <ul className="divide-y divide-[var(--border)] border-y border-line">
                {p.reviews.map((r) => (
                  <li key={r.id} className="py-4">
                    <div className="flex items-center justify-between gap-3 text-[14px]">
                      <span className="font-medium">{r.authorName ?? "Anonymous"}</span>
                      <span className="text-3">{formatDate(r.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] tracking-tight" aria-label={`${r.rating} out of 5`}>
                      {"★".repeat(r.rating)}
                      <span className="text-ink-300">{"★".repeat(5 - r.rating)}</span>
                    </p>
                    {r.title ? <p className="mt-1.5 font-medium">{r.title}</p> : null}
                    {r.body ? <p className="mt-1 text-[15px] text-2">{r.body}</p> : null}
                    {r.ownerResponse ? (
                      <div className="mt-3 border-l-2 border-[var(--rule)] pl-3 text-[14.5px]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-3">Reply from {p.name.split(" ")[0]}</p>
                        <p className="mt-1 text-2">{r.ownerResponse}</p>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14.5px] text-2">No reviews yet. Reviews are checked before they appear and are never paid for.</p>
            )}
            <div className="mt-5 max-w-xl">
              <ReviewForm kind="professional" businessId={p.id} businessSlug={p.slug} />
            </div>
          </section>
          <CiteThis title={`${p.name}, ${prof?.name ?? "professional"}`} path={`/p/${p.slug}`} date={p.updatedAt} />
        </div>

        <aside className="space-y-6 self-start lg:sticky lg:top-24">
          <div className="space-y-3 border-y-2 border-[var(--rule)] py-4 text-[15px]">
            {p.workplace || p.area || p.city ? (
              <p className="flex gap-2.5">
                <MapPin className="mt-1 size-4 shrink-0 text-3" />
                <span>
                  {p.workplace ? <span className="block">{p.workplace}</span> : null}
                  <span className="text-2">{[p.area?.name, p.city?.name].filter(Boolean).join(", ")}</span>
                </span>
              </p>
            ) : null}
            {p.availability ? <p className="text-[14.5px] text-2">Available {p.availability}</p> : null}
            {sameAs.length ? (
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[13.5px]">
                {SOCIAL.filter((s) => p.social[s.key]).map((s) => (
                  <li key={s.key}>
                    <a href={socialUrl(s.base, p.social[s.key]!)} target="_blank" rel="noopener nofollow" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                      {s.label} <ExternalLink className="size-3" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div>
            <p className="font-semibold">Send an enquiry</p>
            <p className="mt-1 text-[13.5px] text-2">Goes to {p.name} directly. We never share your details elsewhere.</p>
            <div className="mt-3">
              <ProLeadForm professionalId={p.id} name={p.name} />
            </div>
          </div>
          <p className="text-[12.5px] text-3">
            Details are supplied by the professional.{p.isVerified ? " Verified means we checked identity and registration." : " Not yet verified by Searchable."}{" "}
            <Link href="/professionals/join" className="underline underline-offset-4">Are you a professional? Create your profile</Link>.
          </p>
        </aside>
      </div>

      {similar.length ? (
        <section className="mt-16">
          <h2 className="eyebrow mb-1">
            More {prof?.plural.toLowerCase() ?? "professionals"}
            {p.city ? ` in ${p.city.name}` : ""}
          </h2>
          <div className="grid gap-x-8 md:grid-cols-3">
            {similar.map((s) => (
              <ProCard key={s.id} p={s} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
