import { getArticle } from "@/db/queries/content";
import { getSeries, seriesStats } from "@/db/queries/data";
import { formatDate, number } from "./format";
import { SITE } from "./utils";
import { getTool, toolUrl } from "@/tools/registry";

/**
 * Plain Markdown versions of our pages for language models and text-first crawlers, served at
 * /api/md/{path} and advertised with <link rel="alternate" type="text/markdown">. Every export starts with
 * the canonical URL, the date and the sources so a citation can be built from the first ten lines.
 */

function header(title: string, path: string, opts: { published?: Date | null; updated?: Date | null; reviewed?: string | null; author?: string | null; kind: string }) {
  const L = [`# ${title}`, "", `Source: ${SITE.name} (${SITE.url}${path})`];
  L.push(`Type: ${opts.kind}`);
  if (opts.author) L.push(`Author: ${opts.author}`);
  if (opts.published) L.push(`Published: ${formatDate(opts.published)}`);
  if (opts.updated) L.push(`Updated: ${formatDate(opts.updated)}`);
  if (opts.reviewed) L.push(`Rates reviewed: ${formatDate(opts.reviewed)}`);
  L.push(`Retrieved: ${formatDate(new Date())}`);
  L.push("");
  return L;
}

export async function articleMarkdown(kind: "news" | "guide", slug: string): Promise<string | null> {
  const a = await getArticle(kind, slug);
  if (!a || a.noindex) return null;
  const path = `/${kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}`;
  const L = header(a.title, path, { kind: kind === "news" ? "News article" : "Guide", published: a.publishedAt, updated: a.updatedAt, author: a.contributorName ?? a.author?.name ?? SITE.name });
  if (a.isSponsored) L.push("Note: sponsored content, labelled as such on the page.", "");
  if (a.dek) L.push(`> ${a.dek}`, "");
  L.push(a.body.trim(), "");
  if (a.faqs?.length) {
    L.push("## Frequently asked questions", "");
    for (const f of a.faqs) L.push(`**${f.question}**`, "", f.answer, "");
  }
  if (a.sources?.length) {
    L.push("## Sources", "");
    for (const s of a.sources) L.push(`- ${s.title}${s.publisher ? ` (${s.publisher})` : ""}${s.url ? `: ${s.url}` : ""}`);
    L.push("");
  }
  L.push(`How to cite: "${a.title}", ${SITE.name}, ${formatDate(a.updatedAt ?? a.publishedAt ?? new Date())}, ${SITE.url}${path}`);
  return L.join("\n");
}

export function toolMarkdown(slug: string): string | null {
  const t = getTool(slug);
  if (!t) return null;
  const path = toolUrl(t);
  const input = Object.fromEntries(t.fields.map((f) => [f.key, f.default as string | number | boolean]));
  let example: string[] = [];
  try {
    const r = t.compute(input);
    example = [`## Worked example (default inputs)`, "", ...t.fields.map((f) => `- ${f.label}: ${String(f.default ?? "")}${"unit" in f && f.unit ? ` ${f.unit}` : ""}`), "", `**${r.headline.label}: ${r.headline.value}**`, "", r.summary ?? "", ""];
    for (const s of r.sections) {
      if (s.title) example.push(`### ${s.title}`, "");
      for (const l of s.lines) example.push(`- ${l.label}: ${l.value}${l.note ? ` (${l.note})` : ""}`);
      example.push("");
    }
  } catch {
    example = [];
  }
  const L = header(t.name, path, { kind: "Calculator", reviewed: t.lastReviewed });
  L.push(t.description, "", `Version ${t.version}. Inputs: ${t.fields.map((f) => f.label).join(", ")}.`, "");
  L.push(...example);
  L.push("## How it is calculated", "", t.methodology.trim(), "");
  if (t.faqs.length) {
    L.push("## Frequently asked questions", "");
    for (const f of t.faqs) L.push(`**${f.question}**`, "", f.answer, "");
  }
  L.push("## Sources", "");
  for (const s of t.sources) L.push(`- ${s.title}${s.publisher ? ` (${s.publisher})` : ""}${s.url ? `: ${s.url}` : ""}`);
  L.push("", `How to cite: "${t.name}", ${SITE.name}, rates reviewed ${formatDate(t.lastReviewed)}, ${SITE.url}${path}`);
  return L.join("\n");
}

export async function dataMarkdown(slug: string): Promise<string | null> {
  const data = await getSeries(slug, 400);
  if (!data) return null;
  const { series, points } = data;
  const latest = points[points.length - 1];
  const stats = await seriesStats(series.id);
  const path = series.slug === "solar-panel-per-watt" ? "/data/solar-panel-price" : `/data/${series.slug}`;
  const L = header(series.name, path, { kind: "Data series", updated: latest ? new Date(latest.date) : null });
  if (latest) L.push(`**Latest: ${number(latest.value, 2)} ${series.unit} on ${formatDate(latest.date)}.**`, "");
  if (series.description) L.push(series.description, "");
  L.push(`Frequency: ${series.frequency}. Source: ${series.sourceName ?? "official"}${series.sourceUrl ? ` (${series.sourceUrl})` : ""}.`);
  if (stats) L.push(`Range on record: ${number(stats.min, 2)} to ${number(stats.max, 2)} ${series.unit} (${stats.n} readings from ${formatDate(stats.first)} to ${formatDate(stats.last)}).`);
  L.push("", `JSON: ${SITE.url}/api/data/${series.slug}`, "", "## History (most recent first)", "", "| Date | Value | Note |", "|---|---|---|");
  for (const p of [...points].reverse().slice(0, 120)) L.push(`| ${p.date} | ${number(p.value, 2)} | ${p.note ?? ""} |`);
  L.push("", `How to cite: "${series.name}", ${SITE.name} data hub, ${latest ? formatDate(latest.date) : ""}, ${SITE.url}${path}`);
  return L.join("\n");
}
