import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, Details, Empty, FilterTabs, Row, Rows, Status } from "@/components/admin";
import { Button } from "@/components/ui";
import { getDb, schema } from "@/db";
import { CLAIM_CONTACT } from "@/lib/claims";
import { formatDate, timeAgo } from "@/lib/format";
import { decideClaim } from "./actions";

export const dynamic = "force-dynamic";

const METHOD_LABEL = { invite: "Invite link", email_domain: "Website email code", phone: "Code from listed number", document: "Document" } as const;
const STATUSES = ["pending", "approved", "rejected", "expired", "all"] as const;

export default async function AdminClaims({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "pending" } = await searchParams;
  const db = await getDb();
  const [rows, counts] = await Promise.all([
    db.query.businessClaims.findMany({
      where: status === "all" ? undefined : eq(schema.businessClaims.status, status as (typeof schema.claimStatus.enumValues)[number]),
      orderBy: [desc(schema.businessClaims.createdAt)],
      limit: 100,
      with: { business: { with: { city: true, primaryCategory: true } }, user: true },
    }),
    db.select({ status: schema.businessClaims.status, n: schema.businessClaims.id }).from(schema.businessClaims),
  ]);
  const count = (s: string) => (s === "all" ? counts.length : counts.filter((c) => c.status === s).length);

  return (
    <AdminPage title="Ownership claims" description={`Approve only with proof tied to the listing. Phone claims: check that "CLAIM <code>" arrived at ${CLAIM_CONTACT.whatsapp} from the listed number, or call it and read the code back.`}>
      <FilterTabs items={STATUSES.map((s) => ({ href: `/admin/claims?status=${s}`, label: s, count: count(s), active: status === s }))} />
      <Rows>
        {rows.map((c) => (
          <Row
            key={c.id}
            actions={
              c.status === "pending" ? (
                <form action={decideClaim} className="flex flex-col items-end gap-1.5">
                  <input type="hidden" name="id" value={c.id} />
                  <input name="note" placeholder="Note to claimant (optional)" className="h-8 w-64 border border-line bg-surface px-2 text-[13px] outline-none focus:border-ink-500" />
                  <div className="flex gap-1.5">
                    <Button size="sm" type="submit" name="decision" value="approve">
                      {c.method === "phone" ? "Code received, approve" : "Approve"}
                    </Button>
                    <Button size="sm" variant="ghost" type="submit" name="decision" value="reject">
                      Reject
                    </Button>
                  </div>
                </form>
              ) : null
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/b/${c.business.slug}`} className="font-medium hover:underline underline-offset-4" target="_blank">
                {c.business.name}
              </Link>
              <Status value={c.status} />
              <span className="text-[12.5px] text-3">
                {METHOD_LABEL[c.method]} · {timeAgo(c.createdAt)}
              </span>
            </div>
            <p className="mt-0.5 text-[13.5px] text-2">
              {[c.business.primaryCategory?.name, c.business.city?.name, c.business.phone, c.business.website?.replace(/^https?:\/\//, "")].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2.5">
              <Details
                items={[
                  { label: "Claimant", value: `${c.contactName ?? c.user.name} (${c.role ?? "role not given"}) · account ${c.user.email}` },
                  { label: "Contact", value: [c.contactPhone, c.contactEmail].filter(Boolean).join(" · ") },
                  { label: "Message", value: c.message },
                  c.method === "phone" ? { label: "Expected code", value: <span className="font-mono">CLAIM {c.verificationCode ?? "(cleared)"}</span> } : { label: "", value: null },
                  c.method === "email_domain" ? { label: "Code sent to", value: c.evidenceUrl?.replace(/^mailto:/, "") } : { label: "", value: null },
                  c.method === "document" && c.evidenceUrl ? { label: "Document", value: <a href={c.evidenceUrl} target="_blank" className="underline underline-offset-4">open document ↗</a> } : { label: "", value: null },
                  { label: "Proof", value: c.verifiedAt ? `received ${formatDate(c.verifiedAt, { dateStyle: "medium", timeStyle: "short" })}` : c.status === "pending" ? "not yet" : null },
                  { label: "Decision", value: c.reviewedAt ? `${formatDate(c.reviewedAt, { dateStyle: "medium", timeStyle: "short" })}${c.decisionNote ? ` · ${c.decisionNote}` : ""}` : null },
                ]}
              />
            </div>
          </Row>
        ))}
        {!rows.length ? <Empty>No {status === "all" ? "" : status} claims.</Empty> : null}
      </Rows>
    </AdminPage>
  );
}
