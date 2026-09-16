import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProCard } from "@/components/professionals/pro-card";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { getProfession, PROFESSIONS } from "@/content/professions";
import { listProfessionals, professionalCities } from "@/lib/professionals";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";

/*
 * The profession list, shared by /professionals/lawyers and /professionals/lawyers/page/2: the page number is
 * in the path so each page is rendered once and served from the CDN.
 */
const LIMIT = 30;

export async function professionMetadata(profession: string, page = 1): Promise<Metadata> {
  const prof = profession === "all" ? null : getProfession(profession);
  if (profession !== "all" && !prof) return { title: "Professionals" };
  const name = prof ? prof.plural : "Professionals";
  return buildMetadata({
    title: `${name} in Pakistan: profiles, fees and contact${page > 1 ? `, page ${page}` : ""}`,
    description: prof ? `Find ${prof.plural.toLowerCase()} across Pakistan with experience, qualifications${prof.licence ? `, ${prof.licence.body} registration` : ""}, fees and direct phone or WhatsApp contact.` : `Every professional on ${SITE.name}, by city.`,
    path: page > 1 ? `/professionals/${profession}/page/${page}` : `/professionals/${profession}`,
    kicker: "Professionals",
  });
}

export async function ProfessionList({ profession, page: pageNum }: { profession: string; page: number }) {
  const prof = profession === "all" ? null : getProfession(profession);
  if (profession !== "all" && !prof) notFound();
  const limit = LIMIT;
  const [{ rows, total }, cities] = await Promise.all([listProfessionals({ profession: prof?.slug, limit, offset: (pageNum - 1) * limit }), professionalCities(prof?.slug, 12)]);
  if (pageNum > 1 && (pageNum - 1) * limit >= total) notFound(); // a page past the end is a 404, not an empty 200
  const name = prof ? prof.plural : "Professionals";
  const crumbs = [{ name: "Professionals", path: "/professionals" }, { name, path: `/professionals/${profession}` }];
  const related = prof ? PROFESSIONS.filter((p) => p.group === prof.group && p.slug !== prof.slug).slice(0, 6) : [];

  return (
    <div className="container-x py-8 sm:py-10">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-6" />
      <SectionHeader as="h1" title={`${name} in Pakistan`} description={`${total ? `${total.toLocaleString()} profile${total === 1 ? "" : "s"}, verified first, then by reviews.` : "Profiles go live here as professionals sign up; the first ones are reviewed by an editor before they appear."}${prof?.licence ? ` Ask for the ${prof.licence.body} number; verified profiles show it.` : ""}`} />
      {cities.length ? (
        <p className="mb-6 flex flex-wrap items-center gap-x-1 gap-y-1 text-[14px]">
          <span className="mr-1 text-3">City</span>
          {cities.map((c) => (
            <Link key={c.slug} href={`/professionals/${profession}/${c.slug}`} className="px-1.5 py-0.5 text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
              {c.name} <span className="text-[12px] text-3">{c.n}</span>
            </Link>
          ))}
        </p>
      ) : null}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          {rows.length ? (
            <div className="grid gap-x-8 md:grid-cols-2">
              {rows.map((p) => (
                <ProCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="border-y border-line py-12 text-center text-[15px] text-2">
              <p>No {name.toLowerCase()} listed yet.</p>
              <p className="mt-2">
                Are you one?{" "}
                <Link href={`/professionals/join?profession=${prof?.slug ?? ""}`} className="underline underline-offset-4">
                  Create the first profile
                </Link>
                .
              </p>
            </div>
          )}
          {total > limit ? (
            <nav className="mt-6 flex items-center justify-between border-t border-line pt-4 text-sm">
              {pageNum > 1 ? <Link href={pageNum === 2 ? `/professionals/${profession}` : `/professionals/${profession}/page/${pageNum - 1}`} className="underline-offset-4 hover:underline">← Previous</Link> : <span />}
              <span className="text-3">Page {pageNum} of {Math.ceil(total / limit)}</span>
              {pageNum * limit < total ? <Link href={`/professionals/${profession}/page/${pageNum + 1}`} className="underline-offset-4 hover:underline">Next →</Link> : <span />}
            </nav>
          ) : null}
        </div>
        <aside className="space-y-8 self-start text-[14.5px] lg:sticky lg:top-24">
          <div className="border-y-2 border-[var(--rule)] py-4">
            <p className="font-display text-xl ">{prof ? `Are you a ${prof.name.toLowerCase()}?` : "Are you a professional?"}</p>
            <p className="mt-1 text-2">Free profile with experience, qualifications, fees, CV and an enquiry form. Verified profiles rank first.</p>
            <Link href={`/professionals/join${prof ? `?profession=${prof.slug}` : ""}`} className="mt-3 inline-flex h-10 items-center bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800">
              Create your profile
            </Link>
          </div>
          {related.length ? (
            <div>
              <p className="eyebrow mb-2">Related</p>
              <ul className="space-y-1 text-2">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/professionals/${r.slug}`} className="underline-offset-4 hover:text-[var(--text)] hover:underline">
                      {r.plural}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
