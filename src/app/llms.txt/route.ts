import { llmsIndex } from "@/lib/llms";

export const revalidate = 3600;

/** llms.txt: a curated map of the site for language models (llmstxt.org). */
export async function GET() {
  return new Response(await llmsIndex(), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
