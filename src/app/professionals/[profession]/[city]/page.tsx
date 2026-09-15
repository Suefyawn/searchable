import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProCard } from "@/components/professionals/pro-card";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { getProfession, PROFESSIONS } from "@/content/professions";
import { getCity } from "@/db/queries/geo";
import { listProfessionals } from "@/lib/professionals";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export const revalidate = 1800;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}
/** Thin pages (under three profiles) stay out of the index until they have substance. */
const INDEX_MIN = 3;

export async function generateMetadata({ params }: { params: Promise<{ profession: string; city: string }> }): Promise<Metadata> {
  const { profession, city: citySlug } = await params;
  const prof = profession === "all" ? null : getProfession(profession);
  const city = await getCity(citySlug);
  if ((profession !== "all" && !prof) || !city) return { title: "Professionals" };
  const { total } = await listProfessionals({ profession: prof?.slug, citySlug, limit: 1 });
  const name = prof ? prof.plural : "Professionals";
  return buildMetadata({
    title: `${name} in ${city.name}: profiles, fees and contact`,
    description: `${total} ${name.toLowerCase()} in ${city.name} with experience, qualifications, fees and direct contact. Verified profiles first.`,
    path: `/professionals/${profession}/${citySlug}`,
    kicker: city.name,
    noindex: total < INDEX_MIN,
  });
}

export default async function ProfessionCityPage({ params }: { params: Promise<{ profession: string; city: string }> }) {
  const { profession, city: citySlug } = await params;
  const prof = profession === "all" ? null : getProfession(profession);
  const city = await getCity(citySlug);
  if ((profession !== "all" && !prof) || !city) notFound();
  const { rows, total } = await listProfessionals({ profession: prof?.slug, citySlug, limit: 60 });
  const name = prof ? prof.plural : "Professionals";
  const crumbs = [
    { name: "Professionals", path: "/professionals" },
    { name, path: `/professionals/${profession}` },
    { name: city.name, path: `/professionals/${profession}/${citySlug}` },
  ];
  const others = prof ? PROFESSIONS.filter((p) => p.group === prof.group && p.slug !== prof.slug).slice(0, 6) : PROFESSIONS.slice(0, 8);

  return (
    <div className="container-x py-8 sm:py-10">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-6" />
      <SectionHeader as="h1" title={`${name} in ${city.name}`} description={`${total} profile${total === 1 ? "" : "s"}, verified first. Call, WhatsApp or send an enquiry from the profile.`} />
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
              <p>
                No {name.toLowerCase()} in {city.name} yet.{" "}
                <Link href={`/professionals/${profession}`} className="underline underline-offset-4">
                  See all cities
                </Link>
                .
              </p>
            </div>
          )}
        </div>
        <aside className="space-y-8 self-start text-[14.5px] lg:sticky lg:top-24">
          <div className="border-y-2 border-[var(--rule)] py-4">
            <p className="font-serif text-xl font-medium">Work in {city.name}?</p>
            <p className="mt-1 text-2">Create a free profile and appear here. Verified profiles rank first.</p>
            <Link href={`/professionals/join${prof ? `?profession=${prof.slug}` : ""}`} className="mt-3 inline-flex h-10 items-center bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800">
              Create your profile
            </Link>
          </div>
          <div>
            <p className="eyebrow mb-2">Also in {city.name}</p>
            <ul className="space-y-1 text-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/professionals/${o.slug}/${citySlug}`} className="underline-offset-4 hover:text-[var(--text)] hover:underline">
                    {o.plural}
                  </Link>
                </li>
              ))}
              <li>
                <Link href={`/cities/${citySlug}`} className="underline-offset-4 hover:text-[var(--text)] hover:underline">
                  Businesses in {city.name} →
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
