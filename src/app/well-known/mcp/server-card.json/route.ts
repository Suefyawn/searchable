import { API_VERSION } from "@/lib/agent-api";
import { MCP_TOOLS } from "@/lib/mcp";
import { SITE } from "@/lib/utils";

export const revalidate = 86400;

/** MCP server card (SEP-1649): how to reach the server and what it offers, without connecting first. */
export function GET() {
  const body = {
    $schema: "https://modelcontextprotocol.io/schemas/server-card.json",
    serverInfo: { name: "searchable-pk", title: "Searchable.pk", version: API_VERSION, description: "Pakistan's prices, rates, calculators, guides and news, read-only, no key. Every result carries the page to cite." },
    protocolVersion: "2025-06-18",
    transport: { type: "streamable-http", endpoint: `${SITE.url}/mcp` },
    endpoint: `${SITE.url}/mcp`,
    authentication: { required: false },
    capabilities: { tools: { listChanged: false } },
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
    documentation: `${SITE.url}/llms.txt`,
    openapi: `${SITE.url}/openapi.json`,
  };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
