import { SITE } from "@/lib/utils";

export const revalidate = 86400;

/** RFC 9727 API catalog: where the public API is described, documented and monitored. */
export function GET() {
  const body = {
    linkset: [
      {
        anchor: `${SITE.url}/api/`,
        "service-desc": [{ href: `${SITE.url}/openapi.json`, type: "application/openapi+json" }],
        "service-doc": [{ href: `${SITE.url}/llms.txt`, type: "text/plain" }],
        status: [{ href: `${SITE.url}/api/health`, type: "application/json" }],
      },
      {
        anchor: `${SITE.url}/mcp`,
        "service-desc": [{ href: `${SITE.url}/.well-known/mcp/server-card.json`, type: "application/json" }],
        "service-doc": [{ href: `${SITE.url}/llms.txt`, type: "text/plain" }],
        status: [{ href: `${SITE.url}/api/health`, type: "application/json" }],
      },
    ],
  };
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/linkset+json; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
