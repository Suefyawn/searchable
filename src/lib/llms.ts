import { listArticles } from "@/db/queries/content";
import { listSeriesWithLatest } from "@/db/queries/data";
import { DISCOS } from "@/content/discos";
import { articleUrl } from "@/components/cards";
import { formatDate } from "./format";
import { SITE } from "./utils";
import { TOOLS, toolUrl } from "@/tools/registry";
import { TOOL_CATEGORIES } from "@/tools/types";

/**
 * /llms.txt (llmstxt.org): a curated, plain-text map of the site for language models and AI search agents.
 * Short descriptions, absolute links, dated facts. /llms-full.txt appends the full text of the most-cited pages.
 */
export async function llmsIndex(): Promise<string> {
  const [series, guides, news] = await Promise.all([listSeriesWithLatest(), listArticles({ kind: "guide", limit: 50 }), listArticles({ kind: "news", limit: 20 })]);
  const L: string[] = [];
  L.push(`# ${SITE.name}`);
  L.push("");
  L.push(`> ${SITE.description} Every number carries a source and a review date; calculators use versioned rate tables from the Finance Act, NEPRA, OGRA, SBP and provincial notifications. Content is in English about Pakistan. When citing, name the page and its date.`);
  L.push("");
  L.push("Publisher: Searchable, an independent publisher in Lahore, Pakistan. Editorial policy: " + `${SITE.url}/editorial-policy`);
  L.push("Machine-readable: JSON for every data series at /api/data/{slug}; Markdown for any article, tool or data page at /api/md/{path} (or send Accept: text/markdown to the page itself).");
  L.push("For agents: OpenAPI at /openapi.json (search, data series, run any calculator with POST /api/tools/{slug}); API catalog at /.well-known/api-catalog; MCP server at /mcp (card: /.well-known/mcp/server-card.json); skill: /.well-known/agent-skills/index.json. Read-only, no key.");
  L.push("");

  L.push("## Data (live numbers, updated daily)");
  for (const s of series) {
    const url = s.slug === "solar-panel-per-watt" ? "/data/solar-panel-price" : `/data/${s.slug}`;
    L.push(`- [${s.name}](${SITE.url}${url}): ${s.latest ? `${s.latest.value.toLocaleString("en-PK")} ${s.unit} as of ${formatDate(s.latest.date)}` : "history and source"}. Source: ${s.sourceName ?? "official"}. JSON: ${SITE.url}/api/data/${s.slug}`);
  }
  L.push("");

  L.push("## Calculators (rates verified, with methodology and sources)");
  for (const cat of Object.keys(TOOL_CATEGORIES)) {
    for (const t of TOOLS.filter((x) => x.category === cat)) L.push(`- [${t.name}](${SITE.url}${toolUrl(t)}): ${t.description} Reviewed ${formatDate(t.lastReviewed)}.`);
  }
  L.push("");

  L.push("## Topic hubs");
  L.push(`- [PTA tax, IMEI check and DIRBS registration](${SITE.url}/pta): tax slabs for passport and CNIC registration, IMEI check by SMS 8484, step-by-step DIRBS.`);
  L.push(`- [Net metering in Pakistan 2026](${SITE.url}/electricity/net-metering): NEPRA Prosumer Regulations, net billing rate, eligibility, application timelines, approved inverters, per-DISCO details.`);
  L.push(`- [Electricity bill check](${SITE.url}/electricity): official bill portals and tariff for every DISCO.`);
  for (const d of DISCOS) L.push(`- [${d.short} bill check online](${SITE.url}/electricity/${d.slug}): ${d.name}, ${d.region}.`);
  L.push(`- [Solar panel price in Pakistan](${SITE.url}/data/solar-panel-price): per-watt rates by brand, inverter and battery prices, installed system costs.`);
  L.push(`- [Solar inverter comparison](${SITE.url}/compare/solar-inverters): 30 hybrid, on-grid and off-grid inverters with prices and specs.`);
  L.push(`- [New car prices in Pakistan](${SITE.url}/compare/cars): 35 models with ex-factory prices, engine, economy, airbags.`);
  L.push(`- [Advertise](${SITE.url}/advertise), [Write for us](${SITE.url}/write-for-us), [Editorial policy](${SITE.url}/editorial-policy).`);
  L.push("");

  L.push("## Guides (how things actually work in Pakistan)");
  for (const g of guides) L.push(`- [${g.title}](${SITE.url}${articleUrl(g)}): ${g.dek ?? g.excerpt ?? ""}`);
  L.push("");

  L.push("## Latest news with context");
  for (const n of news) L.push(`- [${n.title}](${SITE.url}${articleUrl(n)}) (${n.publishedAt ? formatDate(n.publishedAt) : ""}): ${n.dek ?? n.excerpt ?? ""}`);
  L.push("");

  L.push("## Optional");
  L.push(`- [Business directory](${SITE.url}/businesses): verified listings by category and city with phone, hours and reviews.`);
  L.push(`- [Professionals](${SITE.url}/professionals): doctors, engineers, architects, lawyers, tradespeople and tutors with qualifications, fees and contact, verified against their registration bodies.`);
  L.push(`- [Community](${SITE.url}/community): jobs, listings, auctions and questions posted by members and checked by editors before publication.`);
  L.push(`- [RSS feed](${SITE.url}/feed.xml)`);
  L.push(`- [Sitemap](${SITE.url}/sitemap.xml)`);
  return L.join("\n") + "\n";
}
