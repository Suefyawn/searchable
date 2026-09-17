import { listArticles } from "@/db/queries/content";
import { articleUrl } from "@/components/cards";
import { escapeHtml as esc } from "@/lib/markdown";
import { SITE } from "@/lib/utils";

export const revalidate = 3600;

/** RSS 2.0 feed of the latest news and guides. */
export async function GET() {
  const [news, guides] = await Promise.all([listArticles({ kind: "news", limit: 30 }), listArticles({ kind: "guide", limit: 10 })]);
  const items = [...news, ...guides].sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(SITE.name)}</title>
  <link>${SITE.url}</link>
  <description>${esc(SITE.description)}</description>
  <language>en-pk</language>
  <atom:link href="${SITE.url}/feed.xml" rel="self" type="application/rss+xml"/>
${items
  .map(
    (a) => `  <item>
    <title>${esc(a.title)}</title>
    <link>${SITE.url}${articleUrl(a)}</link>
    <guid isPermaLink="true">${SITE.url}${articleUrl(a)}</guid>
    <description>${esc(a.dek ?? a.excerpt ?? "")}</description>
    ${a.category ? `<category>${esc(a.category.name)}</category>` : ""}
    <pubDate>${(a.publishedAt ?? a.updatedAt).toUTCString()}</pubDate>
  </item>`,
  )
  .join("\n")}
</channel>
</rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600" } });
}
