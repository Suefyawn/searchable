import { randomUUID } from "node:crypto";
import { listSeriesWithLatest } from "@/db/queries/data";
import { agentMarkdown, agentSearch, agentSeries, runTool, TOOL_LIST, toolSchema } from "@/lib/agent-api";
import { formatReading } from "@/lib/format";
import { SITE } from "@/lib/utils";

/*
 * A2A agent (a2a-protocol.org): other agents send a question over JSON-RPC and get one text answer built
 * from what the site already publishes, with the page to cite. It looks up, it does not chat: a question we
 * cannot answer from our own data comes back saying so, with the nearest pages.
 */

export const A2A_VERSION = "0.3.0";

export type Part = { kind: "text"; text: string };
export type Message = { kind: "message"; role: "agent"; messageId: string; parts: Part[]; contextId?: string; taskId?: string };

export const A2A_SKILLS = [
  { id: "pakistan-rates", name: "Pakistan prices and rates today", description: "Today's petrol and diesel price, gold and silver per tola, dollar, riyal and dirham rates, KSE-100, SBP policy rate, KIBOR and inflation, each with the date and the page to cite.", tags: ["pakistan", "prices", "forex", "gold", "fuel"], examples: ["petrol price in pakistan today", "gold rate per tola", "usd to pkr"] },
  { id: "pakistan-calculators", name: "Pakistani tax and bill calculators", description: "Run a calculator for Pakistan: income tax and take-home salary on the current FBR slabs, zakat, PTA mobile tax, electricity bill from units, car finance, stamp duty, National Savings profit.", tags: ["tax", "salary", "zakat", "bills", "calculator"], examples: ["income tax on 250000 monthly salary", "pta tax on iphone 17", "electricity bill for 400 units"] },
  { id: "pakistan-answers", name: "Guides, news and directory lookup", description: "Search Searchable.pk's guides (NADRA, FBR, passports, bills, SIMs, property, cars), news with the numbers explained, and the business and professional directory, returning titles, snippets and canonical URLs.", tags: ["pakistan", "guides", "news", "directory", "search"], examples: ["how to check filer status", "lesco bill check", "hospitals in lahore"] },
];

const TEXT = (s: string): Message => ({ kind: "message", role: "agent", messageId: randomUUID(), parts: [{ kind: "text", text: s }] });

function textOf(params: unknown): string {
  const m = (params as { message?: { parts?: { kind?: string; text?: string }[] } })?.message;
  return (m?.parts ?? [])
    .filter((p) => p.kind === "text" && p.text)
    .map((p) => p.text as string)
    .join(" ")
    .trim();
}

/** Answer one question from the site's own data. */
export async function answer(question: string): Promise<string> {
  const q = question.trim();
  if (!q) return "Ask about a price or rate in Pakistan, a calculation (income tax, zakat, PTA tax, electricity bill), or anything on Searchable.pk.";
  const lower = q.toLowerCase();

  // A calculator, when the question names one and carries a number.
  const tool = TOOL_LIST.find((t) => lower.includes(t.name.toLowerCase().replace(/ calculator.*$/i, "")) || lower.includes(t.slug.replace(/-calculator$/, "").replace(/-/g, " ")));
  const numbers = q.match(/\d[\d,]*(?:\.\d+)?/g)?.map((n) => Number(n.replace(/,/g, ""))) ?? [];
  if (tool && numbers.length) {
    const schema = toolSchema(tool.slug);
    const firstNumberKey = Object.entries(schema?.inputSchema.properties ?? {}).find(([, v]) => (v as { type?: string }).type === "number")?.[0];
    if (firstNumberKey) {
      const r = runTool(tool.slug, { [firstNumberKey]: numbers[0] });
      if (r) {
        const lines = [`${r.result.headline.label}: ${r.result.headline.value}`, r.result.summary ?? "", `Run it yourself: ${r.url}`, r.sources.length ? `Source: ${r.sources.map((s) => s.title).join("; ")} (reviewed ${r.lastReviewed}).` : ""];
        return lines.filter(Boolean).join("\n");
      }
    }
  }

  // A tracked number, when the question names a series.
  const series = await listSeriesWithLatest();
  const hit = series.find((s) => {
    const words = s.name.toLowerCase().replace(/ in pakistan.*| today.*/g, "").split(/\W+/).filter((w) => w.length > 2);
    return words.length ? words.every((w) => lower.includes(w)) : false;
  }) ?? series.find((s) => lower.includes(s.slug.split("-")[0]) && /price|rate|today|kitna|kya/.test(lower));
  if (hit?.latest) {
    const full = await agentSeries(hit.slug, 2);
    const prev = full?.points?.[0];
    const move = prev && prev.value !== hit.latest.value ? ` (was ${formatReading(prev.value, hit.unit)} on ${prev.date})` : "";
    return `${hit.name}: ${formatReading(hit.latest.value, hit.unit)} on ${hit.latest.date}${move}. Source: ${hit.sourceName ?? "official"}. Page to cite: ${SITE.url}/data/${hit.slug}`;
  }

  // Otherwise the site's own search, with the markdown of the best page.
  const r = await agentSearch(q, undefined, 5);
  if (!r.results.length) return `Searchable.pk has nothing on that yet. Start from ${SITE.url}/today for today's numbers or ${SITE.url}/guides for how-to guides.`;
  const best = r.results[0];
  const md = await agentMarkdown(new URL(best.url).pathname).catch(() => null);
  const head = md ? md.split("\n").slice(0, 14).join("\n") : `${best.title}: ${best.url}`;
  const others = r.results.slice(1, 4).map((x) => `- ${x.title}: ${x.url}`);
  return [head, "", others.length ? "Also on Searchable.pk:" : "", ...others].filter(Boolean).join("\n");
}

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: unknown };

/** Handle one A2A JSON-RPC message. Messages only: every answer is immediate, so no task is created. */
export async function handleA2a(msg: Rpc): Promise<unknown | null> {
  const id = msg.id ?? null;
  if (msg.method === "message/send") {
    const text = textOf(msg.params);
    const contextId = (msg.params as { message?: { contextId?: string } })?.message?.contextId;
    return { jsonrpc: "2.0", id, result: { ...TEXT(await answer(text)), ...(contextId ? { contextId } : {}) } };
  }
  if (msg.method === "message/stream") return { jsonrpc: "2.0", id, error: { code: -32004, message: "Streaming is not supported; use message/send" } };
  if (msg.method.startsWith("tasks/")) return { jsonrpc: "2.0", id, error: { code: -32001, message: "This agent answers immediately and creates no tasks" } };
  if (msg.method === "agent/getAuthenticatedExtendedCard") return { jsonrpc: "2.0", id, error: { code: -32003, message: "No authenticated card: the public card is complete" } };
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${msg.method}` } };
}
