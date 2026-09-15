import { buildMetadata } from "@/lib/seo";
import { ContactForm } from "./contact-form";

export const metadata = buildMetadata({ title: "Contact", description: "Report an error, suggest a guide or tool, or ask about a listing.", path: "/contact" });

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ about?: string }> }) {
  const { about } = await searchParams;
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-semibold">Contact</h1>
        <p className="mt-2 text-2">Report an error, suggest a guide or calculator, or ask about a listing. We read everything.</p>
        <div className="mt-6 surface p-6">
          <ContactForm about={about} />
        </div>
        <p className="mt-4 text-sm text-3">Prefer email? hello@searchable.pk</p>
      </div>
    </div>
  );
}
