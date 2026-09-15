import { desc } from "drizzle-orm";
import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { reviewClaim } from "../businesses/actions";

export default async function AdminLeads() {
  const db = await getDb();
  const [leads, claims] = await Promise.all([
    db.query.businessLeads.findMany({ orderBy: [desc(schema.businessLeads.createdAt)], limit: 100, with: { business: true } }),
    db.query.businessClaims.findMany({ orderBy: [desc(schema.businessClaims.createdAt)], limit: 100, with: { business: true, user: true } }),
  ]);
  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-4 text-2xl font-semibold">Claims</h1>
        <div className="surface divide-y divide-[var(--border)]">
          {claims.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  <Link href={`/b/${c.business.slug}`} className="hover:text-brand-700">
                    {c.business.name}
                  </Link>{" "}
                  <Badge tone={c.status === "approved" ? "success" : c.status === "pending" ? "warning" : "neutral"}>{c.status}</Badge>
                </p>
                <p className="text-sm text-2">
                  {c.user.name} ({c.user.email}) · {formatDate(c.createdAt)}
                </p>
                {c.message ? <p className="mt-1 text-sm text-3">{c.message}</p> : null}
              </div>
              {c.status === "pending" ? (
                <div className="flex gap-1.5">
                  <form action={reviewClaim.bind(null, c.id, "approved")}>
                    <Button size="sm" type="submit">
                      Approve
                    </Button>
                  </form>
                  <form action={reviewClaim.bind(null, c.id, "rejected")}>
                    <Button size="sm" variant="ghost" type="submit">
                      Reject
                    </Button>
                  </form>
                </div>
              ) : null}
            </div>
          ))}
          {!claims.length ? <p className="px-4 py-6 text-center text-2">No claims yet.</p> : null}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Enquiries (leads)</h2>
        <div className="surface divide-y divide-[var(--border)]">
          {leads.map((l) => (
            <div key={l.id} className="px-4 py-3">
              <p className="font-medium">
                {l.name} → <Link href={`/b/${l.business.slug}`} className="hover:text-brand-700">{l.business.name}</Link>
              </p>
              <p className="text-sm text-2">
                {l.phone} · {formatDate(l.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {l.source}
              </p>
              {l.message ? <p className="mt-1 text-sm text-3">{l.message}</p> : null}
            </div>
          ))}
          {!leads.length ? <p className="px-4 py-6 text-center text-2">No enquiries yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
