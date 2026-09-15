import type { MetadataRoute } from "next";
import { SITE } from "@/lib/utils";

const PRIVATE = ["/admin", "/account", "/business", "/api/", "/search", "/login", "/orders/", "/newsletter/confirm", "/newsletter/unsubscribe", "/newsletter/manage"];

/**
 * Everyone is welcome, including AI crawlers: being cited by assistants is a goal, not a threat (docs/SEO-AI.md).
 * Each AI agent is named explicitly so a future policy change is one line, and so that agents which only honour
 * their own token (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended) see an allow rule.
 */
const AI_AGENTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended", "Amazonbot", "Bytespider", "CCBot", "cohere-ai", "DuckAssistBot", "Meta-ExternalAgent", "Meta-ExternalFetcher", "YouBot", "MistralAI-User"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...AI_AGENTS.map((ua) => ({ userAgent: ua, allow: ["/", "/llms.txt", "/llms-full.txt", "/api/data/", "/api/md/"], disallow: PRIVATE.filter((p) => p !== "/api/") })),
    ],
    sitemap: [`${SITE.url}/sitemap.xml`, `${SITE.url}/news-sitemap.xml`],
    host: SITE.url,
  };
}
