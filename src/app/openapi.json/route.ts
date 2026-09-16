import { API_VERSION, TOOL_LIST } from "@/lib/agent-api";
import { SITE } from "@/lib/utils";

export const revalidate = 3600;

/** OpenAPI 3.1 for the public, key-free read API (RFC 9727 service-desc). */
export function GET() {
  const doc = {
    openapi: "3.1.0",
    info: {
      title: "Searchable.pk public API",
      version: API_VERSION,
      description: "Read-only, no key: search the site, read any data series (petrol, gold, dollar, rates), run any calculator, and fetch pages as markdown. Cite the url each answer carries.",
      contact: { url: `${SITE.url}/contact` },
      license: { name: "Data: CC BY 4.0 with attribution to Searchable.pk" },
    },
    servers: [{ url: SITE.url }],
    paths: {
      "/api/search": { get: { operationId: "search", summary: "Search news, guides, tools, data, businesses and professionals", parameters: [q("q", "Query", true), q("type", "Limit to one type: article, tool, business, location, entity, data, professional"), q("limit", "Max results (default 20)")], responses: ok("Search results with url, title, type and snippet") } },
      "/api/suggest": { get: { operationId: "suggest", summary: "Autocomplete suggestions", parameters: [q("q", "Prefix", true)], responses: ok("Suggestions") } },
      "/api/data/{slug}": { get: { operationId: "dataSeries", summary: "Every reading of a data series (JSON, or CSV with format=csv)", parameters: [p("slug", "Series slug, e.g. petrol-price, usd-pkr, gold-24k-tola, sbp-policy-rate"), q("format", "csv for CSV")], responses: ok("Series with latest and history") } },
      "/api/tools/{slug}": {
        get: { operationId: "toolSchema", summary: "A calculator's inputs as JSON Schema", parameters: [p("slug", "Tool slug, see the list in x-tools")], responses: ok("Schema with defaults and the page to cite") },
        post: { operationId: "runTool", summary: "Run a calculator", parameters: [p("slug", "Tool slug")], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { inputs: { type: "object", description: "Keys from the tool's inputSchema; omitted keys take their defaults" } } } } } }, responses: ok("Headline figure, sections, warnings and sources") },
      },
      "/api/md/{path}": { get: { operationId: "pageMarkdown", summary: "Markdown rendition of a page (news/{cat}/{slug}, guides/{cat}/{slug}, tools/{cat}/{slug}, data/{slug})", parameters: [p("path", "Page path without the leading slash")], responses: { "200": { description: "text/markdown", content: { "text/markdown": { schema: { type: "string" } } } } } } },
      "/api/health": { get: { operationId: "health", summary: "Liveness", responses: ok("ok") } },
      "/llms.txt": { get: { operationId: "llmsTxt", summary: "Curated map of the site for language models", responses: { "200": { description: "text/plain" } } } },
    },
    "x-tools": TOOL_LIST,
    "x-mcp": { endpoint: `${SITE.url}/mcp`, card: `${SITE.url}/.well-known/mcp/server-card.json` },
  };
  return new Response(JSON.stringify(doc), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}

function q(name: string, description: string, required = false) {
  return { name, in: "query", required, description, schema: { type: "string" } };
}
function p(name: string, description: string) {
  return { name, in: "path", required: true, description, schema: { type: "string" } };
}
function ok(description: string) {
  return { "200": { description, content: { "application/json": { schema: { type: "object" } } } } };
}
