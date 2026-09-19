import { z } from "zod";
import { ApiError, withAdminApi } from "@/lib/admin-api";
import { bindings } from "@/lib/platform";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  url: z.string().url().refine((u) => u.startsWith("https://"), "https only"),
  /** "markdown" (default) is what an agent reads best; "html" is the rendered document; "text" strips the tags. */
  format: z.enum(["markdown", "html", "text"]).default("markdown"),
  /** A CSS selector to wait for before capturing (a price table that arrives late). */
  waitFor: z.string().max(200).optional(),
  /** Milliseconds to wait for the page to settle; 30 s cap. */
  timeoutMs: z.number().int().min(1000).max(30_000).default(20_000),
  /** Return only this element's content. */
  selector: z.string().max(200).optional(),
  /** Extra time after load for client-side rendering; default 3 s, up to 10 s. Heavy retail sites never go network-idle. */
  settleMs: z.number().int().min(0).max(10_000).default(3000),
});

/**
 * POST /api/admin/fetch (ADR-55): a real browser on Cloudflare loads the page, runs its JavaScript and returns the
 * rendered content. For the automation's price lists and any maker or bank site that renders prices client-side
 * or refuses plain fetchers. Editor role or the admin key. Every call costs browser time (10 hours a month
 * included), so the task uses it for pages that fail a plain fetch, not for everything.
 */
export const POST = withAdminApi(async (_req, { body, user }) => {
  const d = Body.parse(body);
  const browser = bindings().BROWSER;
  if (!browser) throw new ApiError(503, "Browser Run is not available on this server");
  // "load" rather than network idle: retail sites keep trackers talking for minutes; the settle wait lets their scripts paint prices.
  const gotoOptions = { waitUntil: "load", timeout: d.timeoutMs };
  const common = { url: d.url, gotoOptions, rejectResourceTypes: ["image", "media", "font"], ...(d.waitFor ? { waitForSelector: { selector: d.waitFor, timeout: d.timeoutMs } } : { waitForTimeout: d.settleMs }) };
  const started = Date.now();
  const res = await browser.quickAction(d.format === "markdown" ? "markdown" : "content", common);
  if (!res.ok) throw new ApiError(502, `Browser Run answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  // Quick actions answer a JSON envelope { success, result } (the result is the markdown or HTML string).
  const raw = await res.text();
  let content = raw;
  try {
    const parsed = JSON.parse(raw) as { success?: boolean; result?: unknown; errors?: unknown };
    if (parsed && typeof parsed === "object" && "result" in parsed) {
      if (parsed.success === false) throw new ApiError(502, `Browser Run failed: ${JSON.stringify(parsed.errors).slice(0, 300)}`);
      content = typeof parsed.result === "string" ? parsed.result : JSON.stringify(parsed.result);
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    // not JSON: the body already is the content
  }
  if (d.format !== "markdown" && d.selector) {
    // One element only: a cheap tag-aware slice, no DOM library on the Worker.
    const id = d.selector.match(/^#([\w-]+)$/)?.[1];
    const cls = d.selector.match(/^\.([\w-]+)$/)?.[1];
    const re = id ? new RegExp(`<[^>]+id="${id}"[\s\S]*?(?=<\/(?:table|section|div|main|article)>)`, "i") : cls ? new RegExp(`<[^>]+class="[^"]*\b${cls}\b[^"]*"[\s\S]*?(?=<\/(?:table|section|div|main|article)>)`, "i") : null;
    const m = re ? content.match(re) : null;
    if (m) content = m[0];
  }
  if (d.format === "text") content = content.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { url: d.url, format: d.format, ms: Date.now() - started, browserMs: Number(res.headers.get("x-browser-ms-used") ?? 0) || undefined, length: content.length, content: content.slice(0, 400_000), by: user.email };
});
