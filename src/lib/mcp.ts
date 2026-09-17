import { agentMarkdown, agentSearch, agentSeries, API_VERSION, runTool, TOOL_LIST, toolSchema } from "@/lib/agent-api";
import { listSeriesWithLatest } from "@/db/queries/data";
import { SITE } from "@/lib/utils";
import type { RpcMessage as Rpc } from "@/lib/json-rpc";

/*
 * A small Model Context Protocol server over Streamable HTTP (POST /mcp with JSON-RPC 2.0, JSON responses,
 * no server-initiated stream). Read-only tools that wrap the public API, so an assistant can pull today's
 * petrol price, run the income tax calculator or search the site and cite the page. No dependency: the
 * protocol surface used here is initialize, ping, tools/list and tools/call.
 */

export const MCP_PROTOCOL = "2025-06-18";

type Json = Record<string, unknown>;
type ToolDef = { name: string; description: string; inputSchema: Json; run: (args: Json) => Promise<unknown> };

const text = (v: unknown) => ({ content: [{ type: "text", text: typeof v === "string" ? v : JSON.stringify(v) }] });

export const MCP_TOOLS: ToolDef[] = [
  {
    name: "search",
    description: "Search Searchable.pk: news, guides, calculators, data series, businesses and professionals in Pakistan. Returns titles, snippets and canonical URLs to cite.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, type: { type: "string", description: "Optional: article, tool, business, location, entity, data, professional" }, limit: { type: "number", default: 10 } }, required: ["query"] },
    run: async (a) => text(await agentSearch(String(a.query ?? ""), a.type ? String(a.type) : undefined, Number(a.limit ?? 10))),
  },
  {
    name: "list_data_series",
    description: "Every price and rate series Searchable tracks for Pakistan (petrol, diesel, gold, silver, dollar, riyal, dirham, KSE-100, SBP policy rate, KIBOR, inflation, crypto) with the latest reading.",
    inputSchema: { type: "object", properties: {} },
    run: async () => text((await listSeriesWithLatest()).map((s) => ({ slug: s.slug, name: s.name, unit: s.unit, latest: s.latest, url: `${SITE.url}/data/${s.slug}` }))),
  },
  {
    name: "get_data_series",
    description: "Readings of one series, latest first available with history, e.g. petrol-price, usd-pkr, gold-24k-tola, sbp-policy-rate.",
    inputSchema: { type: "object", properties: { slug: { type: "string" }, limit: { type: "number", default: 30 } }, required: ["slug"] },
    run: async (a) => {
      const r = await agentSeries(String(a.slug ?? ""), Number(a.limit ?? 30));
      return r ? text(r) : { content: [{ type: "text", text: "Unknown series; call list_data_series." }], isError: true };
    },
  },
  {
    name: "list_calculators",
    description: "The calculators available (income tax, take-home salary, zakat, PTA mobile tax, electricity bill, car finance, stamp duty and more) with slugs for run_calculator.",
    inputSchema: { type: "object", properties: {} },
    run: async () => text(TOOL_LIST),
  },
  {
    name: "calculator_inputs",
    description: "JSON Schema of a calculator's inputs, with defaults.",
    inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] },
    run: async (a) => {
      const s = toolSchema(String(a.slug ?? ""));
      return s ? text(s) : { content: [{ type: "text", text: "Unknown calculator; call list_calculators." }], isError: true };
    },
  },
  {
    name: "run_calculator",
    description: "Run a calculator with the given inputs (omitted inputs take their defaults). Returns the headline figure, breakdown, warnings and the sources with dates.",
    inputSchema: { type: "object", properties: { slug: { type: "string" }, inputs: { type: "object" } }, required: ["slug"] },
    run: async (a) => {
      const r = runTool(String(a.slug ?? ""), (a.inputs as Json) ?? {});
      return r ? text(r) : { content: [{ type: "text", text: "Unknown calculator; call list_calculators." }], isError: true };
    },
  },
  {
    name: "get_page",
    description: "A page as markdown by its path: news/{category}/{slug}, guides/{category}/{slug}, tools/{category}/{slug} or data/{slug}. Use search to find paths.",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    run: async (a) => {
      const md = await agentMarkdown(String(a.path ?? ""));
      return md ? text(md) : { content: [{ type: "text", text: "No such page." }], isError: true };
    },
  },
];


const reply = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const fail = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

/** Handle one JSON-RPC message; returns null for notifications (no response body). */
export async function handleMcp(msg: Rpc): Promise<unknown | null> {
  if (msg.method === "initialize") {
    return reply(msg.id, { protocolVersion: MCP_PROTOCOL, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "searchable-pk", title: "Searchable.pk", version: API_VERSION }, instructions: "Read-only tools for Pakistan prices, rates, calculators and pages. Cite the url in every result." });
  }
  if (msg.method.startsWith("notifications/")) return null;
  if (msg.method === "ping") return reply(msg.id, {});
  if (msg.method === "tools/list") return reply(msg.id, { tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
  if (msg.method === "tools/call") {
    const params = (msg.params ?? {}) as Json;
    const name = String(params.name ?? "");
    const tool = MCP_TOOLS.find((t) => t.name === name);
    if (!tool) return fail(msg.id, -32602, `Unknown tool ${name}`);
    try {
      return reply(msg.id, await tool.run((params.arguments as Json) ?? {}));
    } catch (e) {
      return reply(msg.id, { content: [{ type: "text", text: (e as Error).message }], isError: true });
    }
  }
  return fail(msg.id, -32601, `Method not found: ${msg.method}`);
}
