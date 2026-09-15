import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProfessionalEditor } from "@/components/professionals/professional-editor";
import { Badge, SectionHeader } from "@/components/ui";
import { getProfession } from "@/content/professions";
import { requireUser } from "@/lib/auth";
import { canEditProfessional } from "@/lib/professional-actions";
import { professionalEditorOptions } from "@/lib/professional-editor-data";
import { getProfessionalById, toFormInput } from "@/lib/professionals";

export const metadata = { title: "Edit your profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditProfessionalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/professional/${id}`);
  if (!(await canEditProfessional(user, id))) redirect("/professional");
  const p = await getProfessionalById(id);
  if (!p) notFound();
  const opts = await professionalEditorOptions();
  const prof = getProfession(p.professionSlug);
  return (
    <div className="container-x py-8 sm:py-10">
      <p className="mb-3 text-sm">
        <Link href="/professional" className="text-2 underline-offset-4 hover:underline">
          ← Your profiles
        </Link>
      </p>
      <SectionHeader
        as="h1"
        title={p.name}
        description={`${prof?.name ?? p.professionSlug}${p.city ? ` · ${p.city.name}` : ""}. ${p.status === "active" ? "Live: changes show within the hour." : p.status === "pending" ? "Waiting for an editor to approve it." : `Status: ${p.status}.`}`}
        href={p.status === "active" ? `/p/${p.slug}` : undefined}
        hrefLabel="View profile"
      />
      <p className="mb-6 flex flex-wrap items-center gap-2 text-[14px]">
        <Badge tone={p.status === "active" ? "success" : p.status === "pending" ? "warning" : "neutral"}>{p.status}</Badge>
        {p.isVerified ? <Badge tone="success">verified</Badge> : <Badge>not verified</Badge>}
        {!p.isVerified ? (
          <Link href={`/professional/${p.id}/upgrade`} className="underline underline-offset-4">
            Get the Verified badge
          </Link>
        ) : null}
      </p>
      <ProfessionalEditor initial={toFormInput(p)} cities={opts.cities} areas={opts.areas} afterSave="stay" />
    </div>
  );
}
