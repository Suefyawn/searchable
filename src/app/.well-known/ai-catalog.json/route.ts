import { SITE } from "@/lib/utils";

export const revalidate = 86400;

/** ARD / ai-catalog v1.0: one machine-readable menu of everything here an agent can call or read. */
export function GET() {
  const urn = (kind: string, name: string) => `urn:ai:searchable.pk:${kind}:${name}`;
  const catalog = {
    specVersion: "1.0",
    host: { displayName: "Searchable.pk", identifier: "searchable.pk", documentationUrl: `${SITE.url}/llms.txt`, logoUrl: `${SITE.url}/icon-512.png` },
    entries: [
      { identifier: urn("mcp-server", "searchable"), displayName: "Searchable.pk MCP server", type: "application/mcp-server+json", url: `${SITE.url}/.well-known/mcp/server-card.json`, description: "Read-only MCP tools: search the site, read any Pakistan price or rate series, run any calculator, fetch a page as markdown.", tags: ["pakistan", "mcp", "prices", "calculators"] },
      { identifier: urn("agent", "a2a"), displayName: "Searchable.pk A2A agent", type: "application/a2a-agent-card+json", url: `${SITE.url}/.well-known/agent-card.json`, description: "Ask a question about Pakistan prices, rates, taxes, bills or how-to and get one sourced answer with the page to cite.", tags: ["pakistan", "a2a", "questions"] },
      { identifier: urn("api", "openapi"), displayName: "Searchable.pk public API", type: "application/openapi+json", url: `${SITE.url}/openapi.json`, description: "Key-free REST: search, data series with history, calculator schemas and runs, markdown renditions.", tags: ["api", "openapi", "pakistan"] },
      { identifier: urn("skills", "index"), displayName: "Searchable.pk agent skill", type: "application/agent-skills+json", url: `${SITE.url}/.well-known/agent-skills/index.json`, description: "SKILL.md teaching an agent when and how to use Searchable.pk.", tags: ["skill"] },
      { identifier: urn("catalog", "api"), displayName: "API catalog", type: "application/linkset+json", url: `${SITE.url}/.well-known/api-catalog`, description: "RFC 9727 linkset: service description, documentation and status for each API.", tags: ["catalog"] },
      { identifier: urn("docs", "llms"), displayName: "Site map for language models", type: "text/plain", url: `${SITE.url}/llms.txt`, description: "Curated map of the data series, calculators, hubs and guides, with what each one answers.", tags: ["llms-txt", "documentation"] },
    ],
  };
  return new Response(JSON.stringify(catalog), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
