import { unstable_cache } from "next/cache";
import { listArticles, listCategories } from "@/db/queries/content";
import { listSeriesWithLatest } from "@/db/queries/data";
import { categoryCounts } from "@/db/queries/directory";
import { citiesWithCounts } from "@/db/queries/geo";
import { articleUrl } from "@/components/cards";
import { number } from "./format";
import { TOOLS, toolUrl } from "@/tools/registry";
import { TOOL_CATEGORIES } from "@/tools/types";

export type MegaLink = { href: string; label: string; meta?: string };
export type MegaColumn = { title: string; links: MegaLink[]; href?: string };
export type MegaSection = { key: string; label: string; href: string; columns: MegaColumn[]; footer?: { href: string; label: string } };

/** Groups news categories into columns that read like a newspaper's section list. */
const NEWS_GROUPS: { title: string; slugs: string[] }[] = [
  { title: "Pakistan", slugs: ["pakistan", "politics", "business", "economy", "markets", "crypto"] },
  { title: "World", slugs: ["world", "us", "technology", "ai", "science"] },
  { title: "Sport", slugs: ["sports", "cricket", "mma", "snooker"] },
  { title: "Life", slugs: ["education", "health", "auto", "property", "lifestyle", "entertainment", "viral"] },
];

async function build(): Promise<MegaSection[]> {
  const [newsCats, guideCats, latestNews, guides, bizCats, cities, series] = await Promise.all([
    listCategories("news"),
    listCategories("guide"),
    listArticles({ kind: "news", limit: 4 }),
    listArticles({ kind: "guide", limit: 5 }),
    categoryCounts(),
    citiesWithCounts(12),
    listSeriesWithLatest(),
  ]);
  const catLink = (section: "news" | "guides", slug: string, name: string): MegaLink => ({ href: `/${section}/${slug}`, label: name });

  const news: MegaSection = {
    key: "news",
    label: "News",
    href: "/news",
    columns: [
      ...NEWS_GROUPS.map((g) => ({ title: g.title, links: g.slugs.map((s) => newsCats.find((c) => c.slug === s)).filter((c): c is NonNullable<typeof c> => !!c).map((c) => catLink("news", c.slug, c.name)) })),
      { title: "Latest", links: latestNews.map((a) => ({ href: articleUrl(a), label: a.title })) },
    ],
    footer: { href: "/news", label: "All news" },
  };

  const half = Math.ceil(guideCats.length / 2);
  const guidesSection: MegaSection = {
    key: "guides",
    label: "Guides",
    href: "/guides",
    columns: [
      { title: "By topic", links: guideCats.slice(0, half).map((c) => catLink("guides", c.slug, c.name)) },
      { title: " ", links: guideCats.slice(half).map((c) => catLink("guides", c.slug, c.name)) },
      { title: "Most useful", links: guides.map((g) => ({ href: articleUrl(g), label: g.title })) },
      { title: "Contribute", links: [{ href: "/write-for-us", label: "Write for us" }, { href: "/editorial-policy", label: "Editorial policy" }] },
    ],
    footer: { href: "/guides", label: "All guides" },
  };

  const toolCols: MegaColumn[] = (Object.keys(TOOL_CATEGORIES) as (keyof typeof TOOL_CATEGORIES)[])
    .map((cat) => ({ title: TOOL_CATEGORIES[cat].name, href: `/tools/${cat}`, links: TOOLS.filter((t) => t.category === cat).map((t) => ({ href: toolUrl(t), label: t.shortName ?? t.name })) }))
    .filter((c) => c.links.length);
  // Merge the small categories into one column so the panel stays four or five wide.
  const big = toolCols.filter((c) => c.links.length >= 3);
  const small = toolCols.filter((c) => c.links.length < 3);
  const tools: MegaSection = { key: "tools", label: "Tools", href: "/tools", columns: [...big, ...(small.length ? [{ title: "More", links: small.flatMap((c) => c.links) }] : [])], footer: { href: "/tools", label: `All ${TOOLS.length} calculators` } };

  const topCats = bizCats.filter((c) => c.count > 0);
  const businesses: MegaSection = {
    key: "businesses",
    label: "Businesses",
    href: "/businesses",
    columns: [
      { title: "Popular", links: topCats.slice(0, 8).map((c) => ({ href: `/businesses/${c.slug}`, label: c.namePlural ?? c.name, meta: String(c.count) })) },
      { title: "More categories", links: topCats.slice(8, 16).map((c) => ({ href: `/businesses/${c.slug}`, label: c.namePlural ?? c.name, meta: String(c.count) })) },
      { title: "By city", links: cities.slice(0, 8).map((c) => ({ href: `/cities/${c.slug}`, label: c.name, meta: c.count ? String(c.count) : undefined })) },
      { title: "For owners", links: [{ href: "/add-business", label: "Add your business (free)" }, { href: "/business", label: "Owner dashboard" }, { href: "/advertise", label: "Verified & Premium plans" }] },
    ],
    footer: { href: "/businesses", label: "Browse the directory" },
  };

  const withLatest = series.filter((s) => s.latest);
  const fmt = (v: number, unit: string) => (unit === "%" ? `${number(v, 2)}%` : number(v, Number.isInteger(v) ? 0 : 2));
  const dataSection: MegaSection = {
    key: "data",
    label: "Data",
    href: "/data",
    columns: [
      { title: "Prices", links: withLatest.filter((s) => ["petrol-price", "diesel-price", "gold-24k-tola", "gold-22k-tola", "silver-tola", "solar-panel-per-watt"].includes(s.slug)).map((s) => ({ href: s.slug === "solar-panel-per-watt" ? "/data/solar-panel-price" : `/data/${s.slug}`, label: s.name.replace(/ in Pakistan.*$/i, "").replace(/ today$/i, ""), meta: fmt(s.latest!.value, s.unit) })) },
      { title: "Currency", links: withLatest.filter((s) => s.slug.endsWith("-pkr")).map((s) => ({ href: `/data/${s.slug}`, label: s.name.replace(/ in Pakistan.*$/i, "").replace(/ today$/i, ""), meta: fmt(s.latest!.value, s.unit) })) },
      { title: "Rates & markets", links: withLatest.filter((s) => ["sbp-policy-rate", "kibor-1y", "cpi-yoy", "kse-100", "btc-usd", "eth-usd"].includes(s.slug)).map((s) => ({ href: `/data/${s.slug}`, label: s.name.replace(/ in Pakistan.*$/i, "").replace(/ today$/i, ""), meta: fmt(s.latest!.value, s.unit) })) },
      { title: "Hubs", links: [{ href: "/electricity", label: "Electricity bill check" }, { href: "/electricity/net-metering", label: "Net metering 2026" }, { href: "/pta", label: "PTA tax & IMEI" }, { href: "/data/solar-panel-price", label: "Solar panel prices" }] },
    ],
    footer: { href: "/data", label: "All data series" },
  };

  const compare: MegaSection = {
    key: "compare",
    label: "Compare",
    href: "/compare",
    columns: [
      { title: "Comparisons", links: [{ href: "/compare/cars", label: "New car prices" }, { href: "/compare/solar-inverters", label: "Solar inverters" }] },
      { title: "Coming", links: [{ href: "/compare", label: "Bank accounts" }, { href: "/compare", label: "Mobile packages" }, { href: "/compare", label: "Universities" }] },
    ],
    footer: { href: "/compare", label: "All comparisons" },
  };

  const citiesSection: MegaSection = {
    key: "cities",
    label: "Cities",
    href: "/cities",
    columns: [
      { title: "Major cities", links: cities.slice(0, 6).map((c) => ({ href: `/cities/${c.slug}`, label: c.name })) },
      { title: " ", links: cities.slice(6, 12).map((c) => ({ href: `/cities/${c.slug}`, label: c.name })) },
      { title: "Utilities by city", links: [{ href: "/electricity/lesco", label: "LESCO (Lahore)" }, { href: "/electricity/k-electric", label: "K-Electric (Karachi)" }, { href: "/electricity/iesco", label: "IESCO (Islamabad)" }, { href: "/electricity/mepco", label: "MEPCO (Multan)" }] },
    ],
    footer: { href: "/cities", label: "All cities" },
  };

  return [news, guidesSection, tools, businesses, dataSection, compare, citiesSection];
}

/** Cached for 10 minutes so the header never adds noticeable work to a request. */
export const getMegaNav = unstable_cache(build, ["mega-nav"], { revalidate: 600 });
