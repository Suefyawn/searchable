import { llmsIndex } from "@/lib/llms";
import { dataMarkdown, toolMarkdown } from "@/lib/markdown-export";
import { listSeriesWithLatest } from "@/db/queries/data";
import { TOOLS } from "@/tools/registry";

export const revalidate = 3600;

/** llms-full.txt: the index plus the full text of every calculator and data series (the most-cited pages). */
export async function GET() {
  const [index, series] = await Promise.all([llmsIndex(), listSeriesWithLatest()]);
  const tools = TOOLS.map((t) => toolMarkdown(t.slug)).filter(Boolean);
  const data = (await Promise.all(series.map((s) => dataMarkdown(s.slug)))).filter(Boolean);
  const body = [index, "---", ...tools, "---", ...data].join("\n\n");
  return new Response(body, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
