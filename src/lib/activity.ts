import { desc, eq, gt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { listArticles, type ArticleListItem } from "@/db/queries/content";
import { articleUrl } from "@/components/cards";

/**
 * The live feed: everything that changed, newest first: our stories, guides and data-hub readings.
 * Rendered in the home hero's LIVE panel and served by /api/feed for client refresh.
 */
export type FeedItem = {
  kind: "news" | "guide" | "data";
  title: string;
  url: string;
  at: string;
  /** Short label: category for ours, source for press, series for data. */
  label: string;
  external?: boolean;
};

/** `have` lets a page that already holds the latest stories and guides skip those two queries. */
export async function activityFeed(limit = 24, have?: { news: ArticleListItem[]; guides: ArticleListItem[] }): Promise<FeedItem[]> {
  const db = await getDb();
  const since = new Date(Date.now() - 3 * 86_400_000);
  // Our own things only: stories, guides, data readings. Press headlines feed the story-ideas desk, not
  // readers (the founder's call, 2026-09-16: a homepage should not be a list of links to other papers).
  const [news, guides, points] = await Promise.all([
    have ? have.news.slice(0, 14) : listArticles({ kind: "news", limit: 14 }),
    have ? have.guides.slice(0, 5) : listArticles({ kind: "guide", limit: 5 }),
    db
      .select({ value: schema.dataPoints.value, date: schema.dataPoints.date, note: schema.dataPoints.note, createdAt: schema.dataPoints.createdAt, name: schema.dataSeries.name, slug: schema.dataSeries.slug, unit: schema.dataSeries.unit })
      .from(schema.dataPoints)
      .innerJoin(schema.dataSeries, eq(schema.dataPoints.seriesId, schema.dataSeries.id))
      .where(gt(schema.dataPoints.createdAt, since))
      .orderBy(desc(schema.dataPoints.createdAt))
      .limit(3),
  ]);
  const items: FeedItem[] = [
    ...news.filter((a) => a.publishedAt).map((a) => ({ kind: "news" as const, title: a.title, url: articleUrl(a), at: a.publishedAt!.toISOString(), label: a.category?.name ?? "News" })),
    ...guides.filter((a) => a.publishedAt).map((a) => ({ kind: "guide" as const, title: a.title, url: articleUrl(a), at: a.publishedAt!.toISOString(), label: "Guide" })),
    ...points.map((p) => ({
      kind: "data" as const,
      title: `${p.name.replace(/ in Pakistan.*$/i, "").replace(/ today$/i, "")}: ${Number(p.value).toLocaleString("en-PK", { maximumFractionDigits: 2 })} ${p.unit}`,
      url: p.slug === "solar-panel-per-watt" ? "/data/solar-panel-price" : `/data/${p.slug}`,
      at: p.createdAt.toISOString(),
      label: "Data",
    })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

