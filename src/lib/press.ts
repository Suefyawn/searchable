/**
 * Headlines from Pakistan's press, pulled from public RSS feeds and cached for 15 minutes.
 * We show title, source and time and link out — no images, no body text — which is how every aggregator
 * treats RSS. Feeds verified reachable 2026-09-15.
 */

export type PressItem = { source: string; sourceSlug: string; title: string; url: string; publishedAt: string; category: string | null };

export const PRESS_FEEDS: { slug: string; name: string; url: string; topic: "general" | "business" | "tech" }[] = [
  { slug: "dawn", name: "Dawn", url: "https://www.dawn.com/feeds/home", topic: "general" },
  { slug: "tribune", name: "The Express Tribune", url: "https://tribune.com.pk/feed/home", topic: "general" },
  { slug: "geo", name: "Geo News", url: "https://www.geo.tv/rss/1/1", topic: "general" },
  { slug: "thenews", name: "The News", url: "https://www.thenews.com.pk/rss/1/1", topic: "general" },
  { slug: "brecorder", name: "Business Recorder", url: "https://www.brecorder.com/feeds/latest-news", topic: "business" },
  { slug: "propakistani", name: "ProPakistani", url: "https://propakistani.pk/feed/", topic: "tech" },
  { slug: "ary", name: "ARY News", url: "https://arynews.tv/feed/", topic: "general" },
];

const UA = "SearchablePK/0.1 (+https://searchable.pk; RSS reader)";

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(item: string, name: string): string | null {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : null;
}

export function parseRss(xml: string, feed: (typeof PRESS_FEEDS)[number]): PressItem[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const out: PressItem[] = [];
  for (const it of items) {
    const title = tag(it, "title");
    const url = tag(it, "link") ?? it.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? null;
    const date = tag(it, "pubDate") ?? tag(it, "dc:date") ?? tag(it, "published");
    if (!title || !url) continue;
    const publishedAt = date ? new Date(date) : new Date();
    if (Number.isNaN(publishedAt.getTime())) continue;
    out.push({ source: feed.name, sourceSlug: feed.slug, title, url, publishedAt: publishedAt.toISOString(), category: tag(it, "category") });
  }
  return out;
}

/** One feed, cached 15 minutes by Next's fetch cache. A dead feed returns [] rather than failing the page. */
export async function fetchFeed(feed: (typeof PRESS_FEEDS)[number], limit = 20): Promise<PressItem[]> {
  try {
    const res = await fetch(feed.url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml" }, next: { revalidate: 900 } });
    if (!res.ok) return [];
    return parseRss(await res.text(), feed).slice(0, limit);
  } catch {
    return [];
  }
}

/** All feeds merged, newest first, de-duplicated by normalised title. */
export async function fetchPress(opts: { limit?: number; perFeed?: number; topics?: ("general" | "business" | "tech")[] } = {}): Promise<PressItem[]> {
  const feeds = PRESS_FEEDS.filter((f) => !opts.topics || opts.topics.includes(f.topic));
  const lists = await Promise.all(feeds.map((f) => fetchFeed(f, opts.perFeed ?? 15)));
  const seen = new Set<string>();
  const merged: PressItem[] = [];
  for (const item of lists.flat().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(0, opts.limit ?? 40);
}

/** Group for a "from the press" section: one column per source, newest first. */
export function groupBySource(items: PressItem[], perSource = 5): { source: string; sourceSlug: string; items: PressItem[] }[] {
  const groups = new Map<string, PressItem[]>();
  for (const i of items) (groups.get(i.sourceSlug) ?? groups.set(i.sourceSlug, []).get(i.sourceSlug)!).push(i);
  return PRESS_FEEDS.filter((f) => groups.has(f.slug)).map((f) => ({ source: f.name, sourceSlug: f.slug, items: groups.get(f.slug)!.slice(0, perSource) }));
}
