import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessEditor } from "@/components/directory/business-editor";
import { Badge } from "@/components/ui";
import { loadBusinessEditor } from "@/lib/business-editor-data";
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
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{b.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-2">
            <Badge tone={b.status === "active" ? "success" : "warning"}>{b.status}</Badge>
            {b.isVerified ? <Badge tone="brand">verified</Badge> : null}
            <span>{b.primaryCategory?.name}{b.city ? ` · ${b.city.name}` : ""}</span>
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href={`/b/${b.slug}`} target="_blank" className="font-medium text-brand-700 dark:text-brand-300">View ↗</Link>
          <Link href="/admin/businesses" className="text-2">← All businesses</Link>
        </div>
      </div>
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
    </div>
  );
}
