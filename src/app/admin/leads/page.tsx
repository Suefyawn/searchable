import { desc } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, Empty, Row, Rows } from "@/components/admin";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Enquiries sent through listing pages. Owners see their own in the dashboard; this is the whole stream. */
export default async function AdminLeads() {
  const db = await getDb();
  const leads = await db.query.businessLeads.findMany({ orderBy: [desc(schema.businessLeads.createdAt)], limit: 100, with: { business: true } });
  return (
    <AdminPage title="Enquiries" description="Messages customers sent to listings. Unclaimed listings never see these, which is a good reason to invite owners (Outreach).">
      <Rows>
        {leads.map((l) => (
          <Row key={l.id}>
            <p className="font-medium">
              {l.name} → <Link href={`/b/${l.business.slug}`} className="hover:underline underline-offset-4">{l.business.name}</Link>
              {!l.business.claimedAt && !l.business.ownerUserId ? <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-3">unclaimed</span> : null}
            </p>
            <p className="text-[13.5px] text-2">
              {[l.phone, l.email].filter(Boolean).join(" · ")} · {formatDate(l.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              {l.source ? ` · via ${l.source.replace(/_/g, " ")}` : ""}
            </p>
            {l.message ? <p className="mt-1 text-[14.5px]">{l.message}</p> : null}
          </Row>
        ))}
        {!leads.length ? <Empty>No enquiries yet.</Empty> : null}
      </Rows>
    </AdminPage>
  );
}
