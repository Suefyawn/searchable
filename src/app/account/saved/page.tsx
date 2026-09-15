import Link from "next/link";
import { SaveButton } from "@/components/saved/save-button";
import { SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { listSaved } from "@/lib/saved-actions";

export const metadata = { title: "Saved", robots: { index: false } };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { article: "Articles", tool: "Calculators", business: "Businesses", professional: "Professionals", post: "Community", data_series: "Data" };

export default async function SavedPage() {
  const items = await listSaved();
  const groups = new Map<string, typeof items>();
  for (const it of items) groups.set(it.targetType, [...(groups.get(it.targetType) ?? []), it]);
  return (
    <div className="container-x max-w-4xl py-10">
      <p className="mb-3 text-sm">
        <Link href="/account" className="text-2 underline-offset-4 hover:underline">
          ← Your account
        </Link>
      </p>
      <SectionHeader as="h1" title="Saved" description={`${items.length} item${items.length === 1 ? "" : "s"}. Anything you bookmark on the site lands here; it is private to you.`} />
      {!items.length ? <p className="border-y border-line py-10 text-center text-[15px] text-2">Nothing saved yet. Look for the bookmark on articles, calculators, listings, profiles and posts.</p> : null}
      <div className="space-y-8">
        {Array.from(groups.entries()).map(([type, rows]) => (
          <section key={type}>
            <h2 className="eyebrow border-b-2 border-[var(--rule)] pb-1.5">{LABEL[type] ?? type}</h2>
            <ul className="divide-y divide-[var(--border)]">
              {rows.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-4 py-2.5">
                  <Link href={it.url} className="min-w-0 truncate text-[15px] font-medium underline-offset-4 hover:underline">
                    {it.title}
                  </Link>
                  <span className="flex shrink-0 items-center gap-4 text-[12.5px] text-3">
                    {formatDate(it.createdAt)}
                    <SaveButton target={{ targetType: it.targetType, targetId: it.targetId, title: it.title, url: it.url }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
