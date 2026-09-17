import { NextResponse } from "next/server";
import { llmsIndex } from "@/lib/llms";
import { articleMarkdown, dataMarkdown, listingMarkdown, toolMarkdown } from "@/lib/markdown-export";

export const revalidate = 3600;
// A dynamic segment without this renders per request (docs/FREE-TIER.md, ISR gotcha); with it, paths are cached on first hit.
export function generateStaticParams() {
  return [];
}

/**
 * Markdown version of a page: /api/md/news/economy/slug, /api/md/guides/taxes/slug, /api/md/tools/tax/slug,
 * /api/md/data/slug. Advertised on the HTML page as <link rel="alternate" type="text/markdown">.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const [section, a, b] = path;
  let md: string | null = null;
  // "home": the front page as markdown (the llms.txt map), for agents that ask the root with Accept: text/markdown.
  if (section === "home") md = await llmsIndex();
  else if ((section === "news" || section === "guides") && a && b) md = await articleMarkdown(section === "news" ? "news" : "guide", b);
  else if (section === "tools" && a && b) md = toolMarkdown(b);
  else if (section === "data" && a) md = await dataMarkdown(a === "solar-panel-price" ? "solar-panel-per-watt" : a);
  if (!md) md = await listingMarkdown(path.join("/"));
  if (!md) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new Response(md, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=600" } });
}
