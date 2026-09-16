import { A2A_SKILLS, A2A_VERSION } from "@/lib/a2a";
import { API_VERSION } from "@/lib/agent-api";
import { SITE } from "@/lib/utils";

export const revalidate = 86400;

/** A2A agent card: what this agent answers, where to send messages, and what it does not do. */
export function GET() {
  const iface = { url: `${SITE.url}/a2a`, transport: "JSONRPC" };
  const card = {
    protocolVersion: A2A_VERSION,
    name: "Searchable.pk",
    description: "Answers questions about Pakistan from Searchable.pk's own published data: today's prices and rates, tax, bill and finance calculators, step-by-step guides, news with the numbers, and the business directory. Every answer carries the page to cite. Read-only, no authentication.",
    version: API_VERSION,
    url: iface.url,
    preferredTransport: iface.transport,
    supportedInterfaces: [iface],
    additionalInterfaces: [iface],
    provider: { organization: "Searchable.pk", url: SITE.url },
    documentationUrl: `${SITE.url}/llms.txt`,
    iconUrl: `${SITE.url}/icon-512.png`,
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false, extensions: [] },
    securitySchemes: {},
    security: [],
    defaultInputModes: ["text/plain"],
    defaultOutputModes: ["text/plain"],
    skills: A2A_SKILLS.map((s) => ({ ...s, inputModes: ["text/plain"], outputModes: ["text/plain"] })),
  };
  return new Response(JSON.stringify(card), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
