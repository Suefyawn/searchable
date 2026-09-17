/**
 * Headlines from Pakistan's press, pulled from public RSS feeds and cached for 15 minutes.
 * We show title, source and time and link out, no images, no body text, which is how every aggregator
 * treats RSS. Feeds verified reachable 2026-09-15.
 */

export type PressTopic = "general" | "business" | "tech" | "world" | "cricket" | "entertainment" | "markets" | "crypto" | "us" | "mma" | "snooker";
export type PressItem = { source: string; sourceSlug: string; title: string; url: string; publishedAt: string; category: string | null; topic: PressTopic; region: "pk" | "world" };

export const PRESS_FEEDS: { slug: string; name: string; url: string; topic: PressTopic; region: "pk" | "world" }[] = [
  // Pakistan
  { slug: "dawn", name: "Dawn", url: "https://www.dawn.com/feeds/home", topic: "general", region: "pk" },
  { slug: "tribune", name: "The Express Tribune", url: "https://tribune.com.pk/feed/home", topic: "general", region: "pk" },
  { slug: "geo", name: "Geo News", url: "https://www.geo.tv/rss/1/1", topic: "general", region: "pk" },
  { slug: "thenews", name: "The News", url: "https://www.thenews.com.pk/rss/1/1", topic: "general", region: "pk" },
  { slug: "brecorder", name: "Business Recorder", url: "https://www.brecorder.com/feeds/latest-news", topic: "business", region: "pk" },
  { slug: "propakistani", name: "ProPakistani", url: "https://propakistani.pk/feed/", topic: "tech", region: "pk" },
  { slug: "ary", name: "ARY News", url: "https://arynews.tv/feed/", topic: "general", region: "pk" },
  { slug: "geo-sports", name: "Geo Sports", url: "https://www.geo.tv/rss/1/53", topic: "cricket", region: "pk" },
  // World
  { slug: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", topic: "world", region: "world" },
  { slug: "guardian-world", name: "The Guardian", url: "https://www.theguardian.com/world/rss", topic: "world", region: "world" },
  { slug: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", topic: "world", region: "world" },
  { slug: "bbc-business", name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", topic: "business", region: "world" },
  { slug: "bbc-tech", name: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml", topic: "tech", region: "world" },
  { slug: "techcrunch", name: "TechCrunch", url: "https://techcrunch.com/feed/", topic: "tech", region: "world" },
  { slug: "verge", name: "The Verge", url: "https://www.theverge.com/rss/index.xml", topic: "tech", region: "world" },
  { slug: "cricinfo", name: "ESPNcricinfo", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", topic: "cricket", region: "world" },
  { slug: "bbc-cricket", name: "BBC Cricket", url: "https://feeds.bbci.co.uk/sport/cricket/rss.xml", topic: "cricket", region: "world" },
  { slug: "bbc-ents", name: "BBC Entertainment", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", topic: "entertainment", region: "world" },
  { slug: "variety", name: "Variety", url: "https://variety.com/feed/", topic: "entertainment", region: "world" },
  { slug: "cnbc", name: "CNBC Markets", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", topic: "markets", region: "world" },
  { slug: "marketwatch", name: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", topic: "markets", region: "world" },
  { slug: "coindesk", name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", topic: "crypto", region: "world" },
  { slug: "cointelegraph", name: "Cointelegraph", url: "https://cointelegraph.com/rss", topic: "crypto", region: "world" },
  { slug: "npr", name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", topic: "us", region: "world" },
  { slug: "cbs", name: "CBS News", url: "https://www.cbsnews.com/latest/rss/main", topic: "us", region: "world" },
  { slug: "bbc-us", name: "BBC US & Canada", url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml", topic: "us", region: "world" },
  { slug: "sherdog", name: "Sherdog", url: "https://www.sherdog.com/rss/news.xml", topic: "mma", region: "world" },
  { slug: "bbc-snooker", name: "BBC Snooker", url: "https://feeds.bbci.co.uk/sport/snooker/rss.xml", topic: "snooker", region: "world" },
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
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(nbsp|ndash|mdash|hellip|lsquo|rsquo|ldquo|rdquo|amp);/g, (_, name) => ({ nbsp: " ", ndash: "-", mdash: " - ", hellip: "...", lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d", amp: "&" })[name as string] ?? "")
    .replace(/&nbsp;/g, " ")
    // Publishers love the em dash; house style does not.
    .replace(/\s*\u2014\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(item: string, name: string): string | null {
  const m = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : null;
}

export function parseRss(xml: string, feed: (typeof PRESS_FEEDS)[number]): PressItem[] {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  const out: PressItem[] = [];
  for (const it of items) {
    const title = tag(it, "title");
    const url = tag(it, "link") ?? it.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? null;
    const date = tag(it, "pubDate") ?? tag(it, "dc:date") ?? tag(it, "published") ?? tag(it, "updated");
    if (!title || !url) continue;
    const publishedAt = date ? new Date(date) : new Date();
    if (Number.isNaN(publishedAt.getTime())) continue;
    out.push({ source: feed.name, sourceSlug: feed.slug, title, url, publishedAt: publishedAt.toISOString(), category: tag(it, "category"), topic: feed.topic, region: feed.region });
  }
  return out;
}

/** One feed, cached 15 minutes by Next's fetch cache. A dead feed returns [] rather than failing the page. */
export async function fetchFeed(feed: (typeof PRESS_FEEDS)[number], limit = 20): Promise<PressItem[]> {
  try {
    const res = await fetch(feed.url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, application/atom+xml" }, next: { revalidate: 900 }, redirect: "follow" });
    if (!res.ok) return [];
    return parseRss(await res.text(), feed).slice(0, limit);
  } catch {
    return [];
  }
}

/** All feeds merged, newest first, de-duplicated by normalised title. */
export async function fetchPress(opts: { limit?: number; perFeed?: number; topics?: PressTopic[]; region?: "pk" | "world" } = {}): Promise<PressItem[]> {
  const feeds = PRESS_FEEDS.filter((f) => (!opts.topics || opts.topics.includes(f.topic)) && (!opts.region || f.region === opts.region));
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
