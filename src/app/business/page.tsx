import { and, desc, eq, inArray, or } from "drizzle-orm";
import Link from "next/link";
import { Badge, SectionHeader } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Your businesses", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function BusinessDashboard() {
  const user = await requireUser("/business");
  const db = await getDb();
  const approved = await db.query.businessClaims.findMany({ where: and(eq(schema.businessClaims.userId, user.id), eq(schema.businessClaims.status, "approved")), columns: { businessId: true } });
  const ids = approved.map((c) => c.businessId);
  const businesses = await db.query.businesses.findMany({
    where: ids.length ? or(eq(schema.businesses.ownerUserId, user.id), inArray(schema.businesses.id, ids)) : eq(schema.businesses.ownerUserId, user.id),
    with: { primaryCategory: true, city: true, leads: { orderBy: [desc(schema.businessLeads.createdAt)], limit: 5 }, reviews: { orderBy: [desc(schema.businessReviews.createdAt)], limit: 5 } },
    orderBy: [desc(schema.businesses.createdAt)],
  });
  const pendingClaims = await db.query.businessClaims.findMany({ where: and(eq(schema.businessClaims.userId, user.id), eq(schema.businessClaims.status, "pending")), with: { business: true } });

  return (
    <div className="container-x py-10">
      <SectionHeader as="h1" title="Your businesses" description="Keep details current, answer enquiries and respond to reviews. Verified listings rank higher." />
      {!businesses.length && !pendingClaims.length ? (
        <div className="surface p-8 text-center">
          <p className="text-lg font-medium">No businesses yet</p>
          <p className="mt-1 text-2">
            <Link href="/add-business" className="text-brand-700 underline dark:text-brand-300">Add your business</Link> or open any listing and click <em>Claim it</em>.
          </p>
        </div>
      ) : null}
      {pendingClaims.length ? (
        <div className="mb-6 rounded-2xl bg-amber-50 px-5 py-4 text-[15px] dark:border-amber-900 dark:bg-amber-950/30">
          Claims awaiting verification: {pendingClaims.map((c) => c.business.name).join(", ")}. We will contact you within two working days.
        </div>
      ) : null}
      <div className="space-y-6">
        {businesses.map((b) => (
          <section key={b.id} className="surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">
                  <Link href={`/b/${b.slug}`} className="hover:text-brand-700">{b.name}</Link>
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-2">
                  <Badge tone={b.status === "active" ? "success" : "warning"}>{b.status}</Badge>
                  {b.isVerified ? <Badge tone="brand">Verified</Badge> : <Badge>Unverified</Badge>}
                  <span>{b.primaryCategory?.name}{b.city ? ` · ${b.city.name}` : ""}</span>
                  <span>· {b.viewCount} views · {b.clickCount} clicks</span>
                </p>
              </div>
              <Link href={`/business/${b.id}`} className="inline-flex h-9 items-center bg-ink-900 px-3.5 text-sm font-medium text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900">
                Edit listing
              </Link>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-3">Recent enquiries</p>
                {b.leads.length ? (
                  <ul className="mt-2 divide-y divide-[var(--border)] text-[15px]">
                    {b.leads.map((l) => (
                      <li key={l.id} className="py-2">
                        <p className="font-medium">{l.name} · <a href={`tel:${l.phone}`} className="text-brand-700 dark:text-brand-300">{l.phone}</a></p>
                        <p className="text-sm text-2">{l.message}</p>
                        <p className="text-xs text-3">{formatDate(l.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-3">No enquiries yet.</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-3">Recent reviews</p>
                {b.reviews.length ? (
                  <ul className="mt-2 divide-y divide-[var(--border)] text-[15px]">
                    {b.reviews.map((r) => (
                      <li key={r.id} className="py-2">
                        <p className="text-sm text-accent-700">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} <span className="text-3">· {r.authorName ?? "Anonymous"} · {r.status}</span></p>
                        {r.body ? <p className="text-sm text-2">{r.body}</p> : null}
                        <Link href={`/business/${b.id}#review-${r.id}`} className="text-xs font-medium text-brand-700 dark:text-brand-300">
                          {r.ownerResponse ? "Edit response" : "Respond"} →
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-3">No reviews yet.</p>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
