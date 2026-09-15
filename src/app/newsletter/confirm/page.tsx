import Link from "next/link";
import { confirm } from "@/lib/newsletter";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm subscription", robots: { index: false } };

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await confirm(token) : false;
  return (
    <div className="container-x py-20 text-center">
      <div className="mx-auto max-w-md surface p-8">
        <h1 className="text-2xl font-semibold">{ok ? "You are subscribed" : "Link not valid"}</h1>
        <p className="mt-2 text-2">{ok ? "Searchable Daily will arrive every morning. Welcome." : "This confirmation link has already been used or has expired. Subscribe again to get a new one."}</p>
        <Link href={ok ? "/" : "/newsletter"} className="mt-6 inline-flex h-11 items-center rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
          {ok ? "Back to Searchable" : "Subscribe"}
        </Link>
      </div>
    </div>
  );
}
