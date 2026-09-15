import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessEditor } from "@/components/directory/business-editor";
import { AdminPage, Status } from "@/components/admin";
import { Badge } from "@/components/ui";
import { loadBusinessEditor } from "@/lib/business-editor-data";
import { inviteUrl } from "@/lib/claims";
import { findDuplicates } from "@/lib/dedupe";
import { Button } from "@/components/ui";
import { markDuplicateOf } from "../actions";

export default async function AdminEditBusiness({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadBusinessEditor(id);
  if (!data) notFound();
  const b = data.business;
  const dupes = b.status === "duplicate" ? [] : await findDuplicates({ name: b.name, phone: b.phone, whatsapp: b.whatsapp, cityId: b.cityId, cityName: b.city?.name, lat: b.lat, lng: b.lng, excludeId: b.id });
  return (
    <AdminPage
      title={b.name}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <Status value={b.status} />
          {b.isVerified ? <Badge tone="success">verified</Badge> : null}
          {b.claimedAt || b.ownerUserId ? <Badge>claimed</Badge> : <Badge>unclaimed</Badge>}
          <span>
            {b.primaryCategory?.name}
            {b.city ? ` · ${b.city.name}` : ""}
          </span>
        </span>
      }
      actions={
        <>
          <Link href={`/b/${b.slug}`} target="_blank" className="text-sm font-medium underline-offset-4 hover:underline">
            View listing ↗
          </Link>
          <Link href="/admin/businesses" className="text-sm text-2 hover:text-[var(--text)]">
            ← All businesses
          </Link>
        </>
      }
      wide
    >
      {!b.claimedAt && !b.ownerUserId ? (
        <div className="mb-6 border-y border-line py-3 text-[14px]">
          <p className="font-medium">Unclaimed listing</p>
          {b.email ? (
            <>
              <p className="mt-0.5 text-2">
                Personal claim link for {b.email} (valid 60 days, proves control of that address, approves on the spot). Outreach emails it automatically; paste it into WhatsApp or a manual email if you prefer.
                {b.claimInviteSentAt ? ` Invited ${b.claimInviteCount}× so far.` : ""}
              </p>
              <input readOnly value={inviteUrl({ id: b.id, slug: b.slug, email: b.email })} className="mt-2 w-full border border-line bg-surface-2 px-2 py-1.5 font-mono text-[12px]" aria-label="Claim invite link" />
            </>
          ) : (
            <p className="mt-0.5 text-2">No email on file, so outreach cannot reach them. Add one in the editor below, or share /claim/{b.slug} directly; they can verify by website email, phone or document.</p>
          )}
        </div>
      ) : null}
      {dupes.length ? (
        <div className="mb-6 border border-line bg-surface-2 p-4 text-sm">
          <p className="font-semibold">Possible duplicates</p>
          <ul className="mt-2 divide-y divide-[var(--border)]">
            {dupes.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <Link href={`/admin/businesses/${d.id}`} className="font-medium underline-offset-4 hover:underline">{d.name}</Link>
                  <span className="text-2"> · {d.status} · {d.reason === "phone" ? "same phone" : d.reason === "name" ? "same name" : `${Math.round(d.score * 100)}% similar name`}</span>
                </span>
                <form action={markDuplicateOf}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="canonicalId" value={d.id} />
                  <Button size="sm" variant="outline" type="submit">This one is the duplicate → keep “{d.name}”</Button>
                </form>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-3">Merging marks this listing as a duplicate, moves its reviews and leads to the kept listing, and adds a permanent redirect.</p>
        </div>
      ) : null}
      <BusinessEditor initial={data.initial} categories={data.categories} cities={data.cities} areas={data.areas} entities={data.entities} />
    </AdminPage>
  );
}
