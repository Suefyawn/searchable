import { AdminPage, Empty, FilterTabs, Row, Rows, Toolbar } from "@/components/admin";
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
    <AdminPage title="Story ideas" description={`${PRESS_FEEDS.length} feeds, refreshed every 15 minutes. Pick a headline, start a draft, and write the Searchable version: what it means for readers, with numbers and a calculator or guide link. The source goes into the sources list automatically.`} wide>
      <FilterTabs items={TOPICS.map((t) => ({ href: `/admin/ideas?topic=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`, label: t.label, active: topic === t.key }))} />
      <Toolbar search={{ placeholder: "Filter headlines…", defaultValue: q, hidden: { topic } }}>
        <span className="text-3">{filtered.length} headlines</span>
      </Toolbar>
      <Rows>
        {filtered.map((it) => (
          <Row
            key={it.url}
            className="py-2.5"
            actions={
              <form action={startDraftFromHeadline}>
                <input type="hidden" name="title" value={it.title} />
                <input type="hidden" name="url" value={it.url} />
                <input type="hidden" name="source" value={it.source} />
                <input type="hidden" name="topic" value={it.topic} />
                <input type="hidden" name="region" value={it.region} />
                <Button size="sm" variant="outline" type="submit">
                  Start draft
                </Button>
              </form>
            }
          >
            <a href={it.url} target="_blank" rel="noopener" className="font-medium underline-offset-4 hover:underline">
              {it.title}
            </a>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[12.5px] text-3">
              <Badge>{it.topic}</Badge>
              <span>{it.source}</span>
              <span>{timeAgo(new Date(it.publishedAt))}</span>
              {it.category ? <span>{it.category}</span> : null}
            </p>
          </Row>
        ))}
        {filtered.length === 0 ? <Empty>No headlines match.</Empty> : null}
      </Rows>
    </AdminPage>
  );
}
