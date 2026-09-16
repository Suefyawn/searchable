import { SITE } from "@/lib/utils";

export const revalidate = 86400;

/**
 * auth.md: what an agent needs to know about authentication here. Everything an agent reads is public and
 * unauthenticated, so this document says exactly that and describes the one credential that does exist (the
 * editorial key, issued by hand to the publisher's own automation). No OAuth metadata is published because
 * there is no authorization server: claiming one would send agents to an endpoint that does not exist.
 */
export function GET() {
  const md = `# auth.md

Searchable.pk, ${SITE.url}

## Do agents need to authenticate?

No. Everything an agent reads here is public and needs no credential, no key and no registration:

- REST: \`GET /api/search\`, \`GET /api/data/{slug}\`, \`GET /api/tools/{slug}\`, \`POST /api/tools/{slug}\` (runs a calculator), \`GET /api/md/{path}\`, \`GET /api/health\`. Described at \`${SITE.url}/openapi.json\`, catalogued at \`${SITE.url}/.well-known/api-catalog\`.
- MCP: \`POST ${SITE.url}/mcp\` (Streamable HTTP, JSON-RPC). Card: \`${SITE.url}/.well-known/mcp/server-card.json\`.
- A2A: \`POST ${SITE.url}/a2a\` (\`message/send\`). Card: \`${SITE.url}/.well-known/agent-card.json\`.
- Any page as markdown: send \`Accept: text/markdown\`, or use \`/api/md/{path}\`.

There is no \`WWW-Authenticate\` challenge on any of these, and no OAuth authorization server, so no
\`/.well-known/oauth-authorization-server\` or \`/.well-known/oauth-protected-resource\` document is published.

## The one credential that exists

The editorial API (\`/api/admin/*\`) writes to the site: it publishes articles, records data readings, adds
directory listings and price lists. It is used by the publisher's own scheduled automation.

- Method: HTTP bearer token, \`Authorization: Bearer <key>\`, in the header only.
- Audience: the publisher's automation. It is not offered to third-party agents, and there is no
  self-service registration endpoint, so nothing here creates accounts or issues credentials on request.
- How to ask: use the contact form at ${SITE.url}/contact and explain what you want to write and why. Keys are issued by
  hand, scoped to the whole editorial API, and revoked by rotating the key.
- Rate and abuse: write calls are logged with their route, status and duration.

## Rules for agents

- Read freely, cache for an hour, and cite the canonical \`url\` that every answer carries.
- Do not probe \`/api/admin/*\`: without a valid key it answers 401 and nothing else.
- Content signals for this site are published in \`${SITE.url}/robots.txt\`: search yes, AI input yes, AI training yes.
`;
  return new Response(md, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
