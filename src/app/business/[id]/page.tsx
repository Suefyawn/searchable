import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BusinessEditor } from "@/components/directory/business-editor";
import { ReviewResponseForm } from "@/components/directory/review-response-form";
import { Badge } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { canEditBusiness } from "@/lib/business-actions";
import { loadBusinessEditor } from "@/lib/business-editor-data";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Edit your business", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OwnerEditBusiness({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/business/${id}`);
  if (!(await canEditBusiness(user, id))) redirect("/business");
  const data = await loadBusinessEditor(id);
  if (!data) notFound();
  const db = await getDb();
  const reviews = await db.query.businessReviews.findMany({ where: eq(schema.businessReviews.businessId, id), orderBy: [desc(schema.businessReviews.createdAt)], limit: 50 });
  const b = data.business;
  return (
    <div className="container-x py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{b.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-2">
            <Badge tone={b.status === "active" ? "success" : "warning"}>{b.status}</Badge>
            {b.isVerified ? <Badge tone="brand">Verified</Badge> : null}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href={`/b/${b.slug}`} target="_blank" className="font-medium text-brand-700 dark:text-brand-300">View listing ↗</Link>
          <Link href="/business" className="text-2">← Your businesses</Link>
        </div>
      </div>
      <BusinessEditor initial={data.initial} categories={data.categories} cities={data.cities} areas={data.areas} />

      <section className="mt-12 max-w-3xl">
        <h2 className="text-xl font-semibold">Reviews</h2>
        <p className="mt-1 text-sm text-2">Responding publicly to reviews — especially critical ones — is the single biggest trust signal on a listing.</p>
        {reviews.length ? (
          <ul className="mt-4 space-y-3">
            {reviews.map((r) => (
              <li key={r.id} id={`review-${r.id}`} className="surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{r.authorName ?? "Anonymous"}</span>
                  <span className="text-sm text-3">{formatDate(r.createdAt)} · {r.status}</span>
                </div>
                <p className="mt-1 text-sm text-accent-700">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                {r.title ? <p className="mt-2 font-medium">{r.title}</p> : null}
                {r.body ? <p className="mt-1 text-[15px] text-2">{r.body}</p> : null}
                <div className="mt-3">
                  <ReviewResponseForm reviewId={r.id} initial={r.ownerResponse ?? ""} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-2">No reviews yet.</p>
        )}
      </section>
    </div>
  );
}
