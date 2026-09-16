import type { Metadata } from "next";
import Link from "next/link";
import { ProCard } from "@/components/professionals/pro-card";
import { JsonLd, SectionHeader } from "@/components/ui";
import { PROFESSION_GROUPS, type ProfessionGroup } from "@/content/professions";
import { listProfessionals, professionalCities, professionCounts } from "@/lib/professionals";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { HUB_COPY } from "@/lib/seo-copy";

export const revalidate = 1800;

export const metadata: Metadata = buildMetadata({
  ...HUB_COPY.professionals,
  path: "/professionals",
});

export default async function ProfessionalsHub() {
  const [counts, cities, featured] = await Promise.all([professionCounts(), professionalCities(undefined, 12), listProfessionals({ limit: 6 })]);
  const groups = (Object.keys(PROFESSION_GROUPS) as ProfessionGroup[]).map((g) => ({ key: g, label: PROFESSION_GROUPS[g], items: counts.filter((c) => c.group === g) })).filter((g) => g.items.length);
  const total = counts.reduce((a, c) => a + c.count, 0);

  return (
    <div className="container-x py-8 sm:py-10">
      <JsonLd data={breadcrumbJsonLd([{ name: "Professionals", path: "/professionals" }])} />
      <SectionHeader as="h1" title="Professionals" description={`${total >= 10 ? `${total.toLocaleString()} people` : "People"} you can hire directly: doctors, tradespeople, engineers, architects, lawyers, accountants, tutors. Every profile lists experience, qualifications and how to reach them.${total < 10 ? " New profiles go live after a quick check; add yours below." : ""}`} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-10">
          <section>
            <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => (
                <div key={g.key}>
                  <h2 className="eyebrow mb-2 border-b-2 border-[var(--rule)] pb-1.5">{g.label}</h2>
                  <ul className="space-y-1 text-[15px]">
                    {g.items.map((p) => (
                      <li key={p.slug} className="flex items-baseline justify-between gap-3">
                        <Link href={`/professionals/${p.slug}`} className="underline-offset-4 hover:underline">
                          {p.plural}
                        </Link>
                        <span className="tabular text-[12.5px] text-3">{p.count || ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {featured.rows.length ? (
            <section>
              <h2 className="eyebrow mb-1 border-b-2 border-[var(--rule)] pb-1.5">Recently listed</h2>
              <div className="grid gap-x-8 md:grid-cols-2">
                {featured.rows.map((p) => (
                  <ProCard key={p.id} p={p} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-8 self-start text-[14.5px] lg:sticky lg:top-24">
          <div className="border-y-2 border-[var(--rule)] py-4">
            <p className="font-display text-xl ">Are you a professional?</p>
            <p className="mt-1 text-2">A profile is free: experience, qualifications, services, CV, handles and an enquiry form. Verified profiles rank first.</p>
            <Link href="/professionals/join" className="mt-3 inline-flex h-10 items-center bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800">
              Create your profile
            </Link>
          </div>
          {cities.length ? (
            <div>
              <p className="eyebrow mb-2">By city</p>
              <ul className="space-y-1 text-2">
                {cities.map((c) => (
                  <li key={c.slug} className="flex items-baseline justify-between">
                    <Link href={`/professionals/all/${c.slug}`} className="underline-offset-4 hover:underline hover:text-[var(--text)]">
                      {c.name}
                    </Link>
                    <span className="tabular text-[12.5px] text-3">{c.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="text-2">
            <p className="font-medium text-[var(--text)]">How verification works</p>
            <p className="mt-1">We check the registration number with the profession&rsquo;s body (PMDC, PEC, PCATP, Bar Council, ICAP) and an identity document. Verified profiles carry the badge and a date.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
