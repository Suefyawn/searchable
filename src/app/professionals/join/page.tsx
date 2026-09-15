import Link from "next/link";
import { ProfessionalEditor } from "@/components/professionals/professional-editor";
import { SectionHeader } from "@/components/ui";
import { getProfession } from "@/content/professions";
import { requireUser } from "@/lib/auth";
import { professionalEditorOptions } from "@/lib/professional-editor-data";
import { professionalsForUser } from "@/lib/professionals";

export const metadata = { title: "Create your professional profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ profession?: string }> }) {
  const { profession } = await searchParams;
  const user = await requireUser(`/professionals/join${profession ? `?profession=${profession}` : ""}`);
  const [opts, mine] = await Promise.all([professionalEditorOptions(), professionalsForUser(user.id)]);
  const prof = profession ? getProfession(profession) : undefined;
  return (
    <div className="container-x py-8 sm:py-10">
      <SectionHeader as="h1" title={prof ? `Your ${prof.name.toLowerCase()} profile` : "Create your professional profile"} description="Free, takes ten minutes, and yours to edit. Name and profession are all that is required; everything else makes the profile stronger. An editor checks new profiles before they go live." />
      {mine.length ? (
        <p className="mb-6 border-y border-line py-3 text-[14.5px] text-2">
          You already have {mine.length === 1 ? "a profile" : `${mine.length} profiles`}:{" "}
          {mine.map((m, i) => (
            <span key={m.id}>
              {i ? ", " : ""}
              <Link href={`/professional/${m.id}`} className="underline underline-offset-4">
                {m.name}
              </Link>
            </span>
          ))}
          . <Link href="/professional" className="underline underline-offset-4">Open your dashboard</Link> or create another below.
        </p>
      ) : null}
      <ProfessionalEditor initial={{ name: user.name, email: user.email, professionSlug: prof?.slug, cvPublic: true }} cities={opts.cities} areas={opts.areas} />
    </div>
  );
}
