import Link from "next/link";
import { unsubscribe } from "@/lib/newsletter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await unsubscribe(token) : false;
  return (
    <div className="container-x py-20 text-center">
      <div className="mx-auto max-w-md surface p-8">
        <h1 className="text-2xl font-semibold">{ok ? "Unsubscribed" : "Link not valid"}</h1>
        <p className="mt-2 text-2">{ok ? "You will not receive Searchable Daily again. You can resubscribe any time." : "This link is not recognised."}</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
          Back to Searchable
        </Link>
      </div>
    </div>
  );
}
