import { listArticles } from "@/db/queries/content";
import { articleUrl } from "@/components/cards";
import { SITE } from "@/lib/utils";

export const revalidate = 900;

/** Google News sitemap: articles from the last 48 hours (the News namespace requires recency). */
export async function GET() {
  const since = Date.now() - 48 * 3600_000;
  const news = (await listArticles({ kind: "news", limit: 100 })).filter((a) => a.publishedAt && a.publishedAt.getTime() >= since);
  const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${news
  .map(
    (a) => `  <url>
    <loc>${SITE.url}${articleUrl(a)}</loc>
    <news:news>
      <news:publication><news:name>${esc(SITE.name)}</news:name><news:language>en</news:language></news:publication>
      <news:publication_date>${a.publishedAt!.toISOString()}</news:publication_date>
      <news:title>${esc(a.title)}</news:title>
    </news:news>
  </url>`,
  )
  .join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300" } });
}
