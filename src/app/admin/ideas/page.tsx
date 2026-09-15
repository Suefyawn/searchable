import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { fetchPress, PRESS_FEEDS, type PressTopic } from "@/lib/press";
import { startDraftFromHeadline } from "./actions";

export const dynamic = "force-dynamic";

const TOPICS: { key: PressTopic | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "general", label: "Pakistan" },
  { key: "world", label: "World" },
  { key: "business", label: "Business" },
  { key: "tech", label: "Technology" },
  { key: "cricket", label: "Cricket" },
  { key: "mma", label: "MMA" },
  { key: "snooker", label: "Snooker" },
  { key: "markets", label: "Markets" },
  { key: "crypto", label: "Crypto" },
  { key: "us", label: "US" },
  { key: "entertainment", label: "Entertainment" },
];

/**
 * Story ideas: every headline from the press feeds, newest first, with a one-click draft.
 * The desk writes its own piece; the headline only seeds the title and the source link.
 */
export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ topic?: string; q?: string }> }) {
  await requireRole("editor");
  const { topic = "all", q = "" } = await searchParams;
  const items = await fetchPress({ limit: 200, perFeed: 25, topics: topic === "all" ? undefined : [topic as PressTopic] });
  const filtered = q ? items.filter((i) => i.title.toLowerCase().includes(q.toLowerCase())) : items;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Story ideas</h1>
      <p className="mb-4 text-sm text-2">
        {PRESS_FEEDS.length} feeds, refreshed every 15 minutes. Pick a headline, click <em>Start draft</em>, and write the Searchable version: what it means for readers, with numbers and a tool or guide link. The source goes in the sources list automatically.
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2 border-y border-line py-2 text-sm">
        {TOPICS.map((t) => (
          <Link key={t.key} href={`/admin/ideas?topic=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`px-2.5 py-1.5 ${topic === t.key ? "bg-ink-900 text-white" : "text-2 hover:bg-surface-2"}`}>
            {t.label}
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="topic" value={topic} />
          <input name="q" defaultValue={q} placeholder="Filter headlines" className="h-8 border border-line bg-surface px-2 text-sm" />
          <Button size="sm" variant="secondary" type="submit">Filter</Button>
        </form>
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {filtered.map((it) => (
          <li key={it.url} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <a href={it.url} target="_blank" rel="noopener" className="font-medium underline-offset-4 hover:underline">
                {it.title}
              </a>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-3">
                <Badge>{it.topic}</Badge>
                <span>{it.source}</span>
                <span>{timeAgo(new Date(it.publishedAt))}</span>
                {it.category ? <span>{it.category}</span> : null}
              </p>
            </div>
            <form action={startDraftFromHeadline}>
              <input type="hidden" name="title" value={it.title} />
              <input type="hidden" name="url" value={it.url} />
              <input type="hidden" name="source" value={it.source} />
              <input type="hidden" name="topic" value={it.topic} />
              <input type="hidden" name="region" value={it.region} />
              <Button size="sm" variant="outline" type="submit">Start draft</Button>
            </form>
          </li>
        ))}
        {filtered.length === 0 ? <li className="py-8 text-center text-2">No headlines match.</li> : null}
      </ul>
    </div>
  );
}
