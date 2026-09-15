import Link from "next/link";
import { Badge, SectionHeader } from "@/components/ui";
import { getProfession } from "@/content/professions";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { professionalsForUser } from "@/lib/professionals";

export const metadata = { title: "Your professional profiles", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Owner dashboard: status, enquiries and the Verified upsell for each profile this account holds. */
export default async function ProfessionalDashboard() {
  const user = await requireUser("/professional");
  const profiles = await professionalsForUser(user.id);

  return (
    <div className="container-x py-10">
      <SectionHeader as="h1" title="Your professional profiles" description="Keep your profile current, answer enquiries quickly, and get verified to rank first in your profession and city." href="/professionals/join" hrefLabel="Create another profile" />
      {!profiles.length ? (
        <div className="border-y-2 border-[var(--rule)] py-10 text-center">
          <p className="font-serif text-2xl">No profile yet</p>
          <p className="mt-1 text-2">A profile takes ten minutes and is free.</p>
          <Link href="/professionals/join" className="mt-4 inline-flex h-10 items-center bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800">
            Create your profile
          </Link>
        </div>
      ) : null}
      <div className="space-y-10">
        {profiles.map((p) => {
          const prof = getProfession(p.professionSlug);
          return (
            <section key={p.id} className="border-t-2 border-[var(--rule)] pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl font-medium">
                    {p.status === "active" ? (
                      <Link href={`/p/${p.slug}`} className="hover:underline underline-offset-4">
                        {p.name}
                      </Link>
                    ) : (
                      p.name
                    )}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-2">
                    <Badge tone={p.status === "active" ? "success" : p.status === "pending" ? "warning" : "neutral"}>{p.status}</Badge>
                    {p.isVerified ? <Badge tone="success">Verified</Badge> : <Badge>Not verified</Badge>}
                    <span>
                      {prof?.name ?? p.professionSlug}
                      {p.city ? ` · ${p.city.name}` : ""}
                    </span>
                    <span>
                      · {p.viewCount} views · {p.clickCount} contact clicks
                    </span>
                  </p>
                  {p.status === "pending" ? <p className="mt-2 text-[14px] text-2">An editor checks new profiles within a working day. You can keep editing meanwhile.</p> : null}
                  {p.status === "rejected" ? <p className="mt-2 text-[14px] text-2">This profile was not approved. Check that it describes a real person with a real profession, then edit and we will look again.</p> : null}
                </div>
                <div className="flex gap-2">
                  {!p.isVerified ? (
                    <Link href={`/professional/${p.id}/upgrade`} className="inline-flex h-9 items-center border border-line px-3.5 text-sm font-medium hover:bg-surface-2">
                      Get verified
                    </Link>
                  ) : null}
                  <Link href={`/professional/${p.id}`} className="inline-flex h-9 items-center bg-ink-900 px-3.5 text-sm font-medium text-white hover:bg-ink-800">
                    Edit profile
                  </Link>
                </div>
              </div>
              {!p.isVerified && p.status === "active" ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3 text-[14.5px]">
                  <p className="text-2">
                    <span className="font-medium text-[var(--text)]">Get the Verified badge.</span> We check your {prof?.licence?.body ?? "registration"} and identity; you rank above free profiles and your website link is followed. Rs 4,900 a year.
                  </p>
                  <Link href={`/professional/${p.id}/upgrade`} className="inline-flex h-9 items-center bg-ink-900 px-3.5 text-sm font-medium text-white hover:bg-ink-800">
                    See details
                  </Link>
                </div>
              ) : null}
              <div className="mt-5">
                <p className="eyebrow">Recent enquiries</p>
                {p.leads.length ? (
                  <ul className="mt-2 divide-y divide-[var(--border)] text-[15px]">
                    {p.leads.map((l) => (
                      <li key={l.id} className="py-2">
                        <p className="font-medium">
                          {l.name} ·{" "}
                          <a href={`tel:${l.phone}`} className="underline underline-offset-4">
                            {l.phone}
                          </a>
                          {l.email ? (
                            <>
                              {" "}
                              ·{" "}
                              <a href={`mailto:${l.email}`} className="underline underline-offset-4">
                                {l.email}
                              </a>
                            </>
                          ) : null}
                        </p>
                        {l.message ? <p className="text-[14px] text-2">{l.message}</p> : null}
                        <p className="text-[12.5px] text-3">{formatDate(l.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[14px] text-3">No enquiries yet. A photo, services with fees and a clear headline bring the most.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
