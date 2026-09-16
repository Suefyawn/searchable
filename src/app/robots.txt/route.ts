import { SITE } from "@/lib/utils";

const PRIVATE = ["/admin", "/account", "/business", "/api/", "/media/", "/search", "/login", "/orders/", "/newsletter/confirm", "/newsletter/unsubscribe", "/newsletter/manage"];

/**
 * Everyone is welcome, including AI crawlers: being cited by assistants is a goal, not a threat (docs/SEO-AI.md).
 * Each AI agent is named explicitly so a future policy change is one line, and so that agents which only honour
 * their own token (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended) see an allow rule.
 * Written as a route (not metadata robots) so the file can carry Content-Signal lines, which Next's robots
 * object cannot express.
 */
const AI_AGENTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended", "Amazonbot", "Bytespider", "CCBot", "cohere-ai", "DuckAssistBot", "Meta-ExternalAgent", "Meta-ExternalFetcher", "YouBot", "MistralAI-User"];

/** Content Signals (contentsignals.org): search and AI answers yes, training yes; the site wants to be cited. */
const CONTENT_SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=yes";

export const dynamic = "force-static";

export function GET() {
  const lines: string[] = [
    "# Searchable.pk welcomes search engines and AI assistants. Cite us: every page has a markdown rendition",
    "# (Accept: text/markdown, or /api/md/<path>) and /llms.txt lists what is here.",
    "",
    "User-Agent: *",
    CONTENT_SIGNAL,
    "Allow: /",
    "Allow: /api/data/",
    "Allow: /api/tools/",
    "Allow: /api/md/",
    "Allow: /api/health",
    ...PRIVATE.map((p) => `Disallow: ${p}`),
    "",
  ];
  for (const ua of AI_AGENTS) {
    lines.push(`User-Agent: ${ua}`, CONTENT_SIGNAL, "Allow: /", "Allow: /llms.txt", "Allow: /llms-full.txt", "Allow: /api/data/", "Allow: /api/tools/", "Allow: /api/md/", "Allow: /api/health", "Allow: /openapi.json", "Allow: /.well-known/", "Allow: /mcp", "Allow: /a2a", "Allow: /auth.md", ...PRIVATE.filter((p) => p !== "/api/").map((p) => `Disallow: ${p}`), "");
  }
  lines.push(`Agentmap: ${SITE.url}/.well-known/ai-catalog.json`, `Sitemap: ${SITE.url}/sitemap.xml`, `Sitemap: ${SITE.url}/news-sitemap.xml`, `Host: ${SITE.url}`, "");
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
