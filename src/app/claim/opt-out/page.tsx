import Link from "next/link";
import { optOut } from "@/lib/claims";

export const metadata = { title: "No more emails", robots: { index: false } };
export const dynamic = "force-dynamic";

/** One-click opt-out from claim invitations (link in the invite email). */
export default async function OptOutPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const ok = t ? await optOut(t) : false;
  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-lg text-[15px]">
        <h1 className="font-serif text-3xl font-medium">{ok ? "Done. We will not email this address again." : "That link is not valid"}</h1>
        <p className="mt-3 text-2">
          {ok ? "The listing stays online as public information. If it is wrong or the business has closed, use the report link on the listing page and we will fix or remove it." : "The link may have expired. If you want us to stop emailing, reply to the email you received or write to us from the contact page."}
        </p>
        <p className="mt-6">
          <Link href="/" className="underline underline-offset-4">Back to Searchable</Link>
        </p>
      </div>
    </div>
  );
}
