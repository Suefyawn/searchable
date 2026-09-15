import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessEditor } from "@/components/directory/business-editor";
import { Badge } from "@/components/ui";
import { loadBusinessEditor } from "@/lib/business-editor-data";

export default async function AdminEditBusiness({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadBusinessEditor(id);
  if (!data) notFound();
  const b = data.business;
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
      <BusinessEditor initial={data.initial} categories={data.categories} cities={data.cities} areas={data.areas} />
    </div>
  );
}
