import { AdminPage } from "@/components/admin";
import { listArticles, listArticlesByIds } from "@/db/queries/content";
import { requireRole } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { readFrontPage, resolveFront } from "@/lib/front-page";
import { FrontPanel, type Story } from "./front-panel";

export const dynamic = "force-dynamic";

/** Wall-clock time for the lead and breaking countdowns, read outside the render body. */
async function currentTime() {
  return Date.now();
}

/** What leads the site: the breaking bar, the lead story, the pinned slides. Automatic unless touched. */
export default async function AdminFrontPage() {
  await requireRole("editor");
  const front = await readFrontPage();
  const [latest, extra] = await Promise.all([listArticles({ kind: "news", limit: 40 }), listArticlesByIds([...(front.leadId ? [front.leadId] : []), ...front.pins])]);
  const byId = new Map([...latest, ...extra].map((a) => [a.id, a]));
  const now = await currentTime();
  const { ordered, leadSource } = resolveFront(front, latest.slice(0, 12), byId, now);
  const toStory = (a: (typeof latest)[number]): Story => ({ id: a.id, title: a.title, category: a.category?.name ?? "News", publishedAt: a.publishedAt?.toISOString() ?? null, ago: a.publishedAt ? timeAgo(a.publishedAt) : "", image: a.featuredImageUrl, isFeatured: a.isFeatured, url: `/news/${a.category?.slug ?? "general"}/${a.slug}` });
  // The list: pinned and lead stories first even when older than the newest forty.
  const listed = [...extra.filter((a) => !latest.some((l) => l.id === a.id)), ...latest];
  return (
    <AdminPage title="Front page" description="The homepage hero and the news front run themselves: the newest featured story leads for 48 hours, then the newest stories with photos. Pin a lead or an order here when the news calls for it, and put a breaking line across the site.">
      <FrontPanel front={front} stories={listed.map(toStory)} hero={ordered.filter((a) => a.featuredImageUrl).slice(0, 5).map(toStory)} leadSource={leadSource} now={now} />
    </AdminPage>
  );
}
