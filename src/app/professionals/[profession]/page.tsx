import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProCard } from "@/components/professionals/pro-card";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { getProfession, PROFESSIONS } from "@/content/professions";
import { listProfessionals, professionalCities } from "@/lib/professionals";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { SITE } from "@/lib/utils";

export const revalidate = 1800;

export async function generateMetadata({ params }: { params: Promise<{ profession: string }> }): Promise<Metadata> {
  const { profession } = await params;
  const prof = profession === "all" ? null : getProfession(profession);
  if (profession !== "all" && !prof) return { title: "Professionals" };
  const name = prof ? prof.plural : "Professionals";
  return buildMetadata({
    title: `${name} in Pakistan: profiles, fees and contact`,
    description: prof ? `Find ${prof.plural.toLowerCase()} across Pakistan with experience, qualifications${prof.licence ? `, ${prof.licence.body} registration` : ""}, fees and direct phone or WhatsApp contact.` : `Every professional on ${SITE.name}, by city.`,
    path: `/professionals/${profession}`,
    kicker: "Professionals",
  });
}

export default async function ProfessionListPage({ params, searchParams }: { params: Promise<{ profession: string }>; searchParams: Promise<{ page?: string }> }) {
  const { profession } = await params;
  const { page = "1" } = await searchParams;
  const prof = profession === "all" ? null : getProfession(profession);
  if (profession !== "all" && !prof) notFound();
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limit = 30;
  const [{ rows, total }, cities] = await Promise.all([listProfessionals({ profession: prof?.slug, limit, offset: (pageNum - 1) * limit }), professionalCities(prof?.slug, 12)]);
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
              {pageNum > 1 ? <Link href={`/professionals/${profession}?page=${pageNum - 1}`} className="underline-offset-4 hover:underline">← Previous</Link> : <span />}
              <span className="text-3">Page {pageNum} of {Math.ceil(total / limit)}</span>
              {pageNum * limit < total ? <Link href={`/professionals/${profession}?page=${pageNum + 1}`} className="underline-offset-4 hover:underline">Next →</Link> : <span />}
            </nav>
          ) : null}
        </div>
        <aside className="space-y-8 self-start text-[14.5px] lg:sticky lg:top-24">
          <div className="border-y-2 border-[var(--rule)] py-4">
            <p className="font-serif text-xl font-medium">{prof ? `Are you a ${prof.name.toLowerCase()}?` : "Are you a professional?"}</p>
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
