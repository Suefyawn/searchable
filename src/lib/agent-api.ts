import { getSeries } from "@/db/queries/data";
import { articleMarkdown, dataMarkdown, toolMarkdown } from "@/lib/markdown-export";
import { search, type SearchEntityType } from "@/lib/search";
import { SITE } from "@/lib/utils";
import { getTool, TOOLS, toolUrl } from "@/tools/registry";
import type { ToolInput } from "@/tools/types";

/*
 * The read-only operations agents can call, shared by the REST routes (/api/tools/[slug], /openapi.json)
 * and the MCP server (/mcp). Nothing here writes; nothing needs a key. Every answer carries the canonical
 * page so the caller can cite it.
 */

export const API_VERSION = "1.0.0";

/** Tool definition as JSON Schema, so an agent can fill the inputs without reading our TypeScript. */
export function toolSchema(slug: string) {
  const t = getTool(slug);
  if (!t) return null;
  const properties: Record<string, object> = {};
  for (const f of t.fields) {
    if (f.type === "number") properties[f.key] = { type: "number", description: `${f.label}${f.unit ? ` (${f.unit})` : ""}${f.help ? `. ${f.help}` : ""}`, ...(f.default !== undefined ? { default: f.default } : {}), ...(f.min !== undefined ? { minimum: f.min } : {}), ...(f.max !== undefined ? { maximum: f.max } : {}) };
    else if (f.type === "select") properties[f.key] = { type: "string", description: `${f.label}${f.help ? `. ${f.help}` : ""}`, enum: f.options.map((o) => o.value), ...(f.default !== undefined ? { default: f.default } : {}) };
    else properties[f.key] = { type: "boolean", description: `${f.label}${f.help ? `. ${f.help}` : ""}`, ...(f.default !== undefined ? { default: f.default } : {}) };
  }
  return {
    slug: t.slug,
    name: t.name,
    description: t.description,
    category: t.category,
    url: `${SITE.url}${toolUrl(t)}`,
    lastReviewed: t.lastReviewed,
    inputSchema: { type: "object", properties, additionalProperties: false },
  };
}

/** Run a calculator with defaults filled in for anything the caller left out. */
export function runTool(slug: string, inputs: Record<string, unknown>) {
  const t = getTool(slug);
  if (!t) return null;
  const input: ToolInput = {};
  for (const f of t.fields) {
    const v = inputs[f.key];
    if (v === undefined || v === null || v === "") {
      if (f.default !== undefined) input[f.key] = f.default;
      continue;
    }
    if (f.type === "number") input[f.key] = Number(v);
    else if (f.type === "boolean") input[f.key] = v === true || v === "true" || v === 1;
    else input[f.key] = String(v);
  }
  const result = t.compute(input);
  return { tool: t.slug, name: t.name, url: `${SITE.url}${toolUrl(t)}`, inputs: input, result, sources: t.sources, lastReviewed: t.lastReviewed };
}

export async function agentSearch(q: string, type?: string, limit = 10) {
  const r = await search(q, { types: type ? [type as SearchEntityType] : undefined, limit: Math.min(50, Math.max(1, Number(limit) || 10)) });
  return { query: q, total: r.total, results: r.hits.map((x) => ({ ...x, url: x.url.startsWith("http") ? x.url : `${SITE.url}${x.url}` })) };
}

export async function agentSeries(slug: string, limit = 30) {
  const d = await getSeries(slug, Math.min(365, Math.max(1, Number(limit) || 30)));
  if (!d) return null;
  const points = d.points;
  const latest = points[points.length - 1];
  return { slug: d.series.slug, name: d.series.name, unit: d.series.unit, frequency: d.series.frequency, source: d.series.sourceName, url: `${SITE.url}/data/${d.series.slug}`, latest: latest ? { date: latest.date, value: latest.value } : null, points: points.map((p) => ({ date: p.date, value: p.value })) };
}

/** Markdown of a page by its path (/news/x/y, /guides/x/y, /tools/x/y, /data/x). */
export async function agentMarkdown(path: string): Promise<string | null> {
  const parts = path.replace(/^\//, "").split("/");
  const [section, a, b] = parts;
  if ((section === "news" || section === "guides") && a && b) return articleMarkdown(section === "news" ? "news" : "guide", b);
  if (section === "tools" && a && b) return toolMarkdown(b);
  if (section === "data" && a) return dataMarkdown(a);
  return null;
}

export const TOOL_LIST = TOOLS.map((t) => ({ slug: t.slug, name: t.name, category: t.category, description: t.description, url: `${SITE.url}${toolUrl(t)}` }));
