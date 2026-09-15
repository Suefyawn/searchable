import { and, desc, eq, lte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { listArticles } from "@/db/queries/content";
import { listSeriesWithLatest } from "@/db/queries/data";
import { sendEmail } from "./email";
import { formatDate, number } from "./format";
import { renderMarkdown } from "./markdown";
import { trendingSearches } from "./search";
import { SITE } from "./utils";
import { TOOLS, toolUrl } from "@/tools/registry";

type Frequency = "daily" | "weekly";

/** Series that lead the daily email, in order. */
const LEAD_SERIES = ["petrol-price", "usd-pkr", "gold-24k-tola", "sbp-policy-rate"];

/**
 * Assemble a draft issue from the day's (or week's) content: numbers, news, a guide, a tool, trending searches.
 * Returns markdown the editor can rewrite before sending.
 */
export async function assembleIssue(frequency: Frequency = "daily") {
  const days = frequency === "daily" ? 1 : 7;
  const since = new Date(Date.now() - days * 86_400_000);
  const [series, news, guides, trending] = await Promise.all([listSeriesWithLatest(), listArticles({ kind: "news", limit: 12 }), listArticles({ kind: "guide", limit: 6 }), trendingSearches(5)]);

  const fresh = news.filter((a) => a.publishedAt && a.publishedAt >= since);
  const stories = (fresh.length >= 3 ? fresh : news).slice(0, frequency === "daily" ? 5 : 8);
  const guide = guides.find((g) => g.publishedAt && g.publishedAt >= since) ?? guides[0];
  const dayOfYear = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86_400_000);
  const tool = TOOLS[dayOfYear % TOOLS.length];
  const date = new Date();

  const numbers = LEAD_SERIES.map((slug) => series.find((s) => s.slug === slug)).filter((s): s is NonNullable<typeof s> => !!s && !!s.latest);
  const numberLines = numbers.map((s) => {
    const change = s.previous ? s.latest!.value - s.previous.value : 0;
    const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "—";
    const changeText = s.previous && change !== 0 ? ` (${arrow} ${number(Math.abs(change), s.unit === "%" ? 2 : 2)})` : "";
    return `- **${s.name.replace(/ today$/i, "")}:** ${number(s.latest!.value, 2)} ${s.unit}${changeText} — [history](${SITE.url}/data/${s.slug === "solar-panel-per-watt" ? "solar-panel-price" : s.slug})`;
  });

  const headline = stories[0];
  const subject = headline ? `${headline.title}` : `${SITE.name} ${frequency === "daily" ? "Daily" : "Weekly"} — ${formatDate(date)}`;
  const preheader = numbers.length ? numbers.map((s) => `${s.name.replace(/ in Pakistan.*$/i, "").replace(/ today$/i, "")} ${number(s.latest!.value, 0)}`).join(" · ") : SITE.tagline;

  const body = [
    `## The numbers`,
    ...numberLines,
    ``,
    `## ${frequency === "daily" ? "Today" : "This week"}`,
    ...stories.map((a) => `### [${a.title}](${SITE.url}/news/${a.category?.slug ?? "pakistan"}/${a.slug})\n${a.dek ?? a.excerpt ?? ""}`),
    ``,
    guide ? `## Worth reading\n### [${guide.title}](${SITE.url}/guides/${guide.category?.slug ?? "general"}/${guide.slug})\n${guide.dek ?? guide.excerpt ?? ""}` : "",
    ``,
    `## Tool of the day\n### [${tool.name}](${SITE.url}${toolUrl(tool)})\n${tool.description}`,
    ``,
    trending.length ? `## What Pakistan is searching\n${trending.map((t) => `- [${t.query}](${SITE.url}/search?q=${encodeURIComponent(t.query)})`).join("\n")}` : "",
  ]
    .filter((l) => l !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  return { subject, preheader, body, frequency };
}

export async function createIssue(frequency: Frequency = "daily") {
  const draft = await assembleIssue(frequency);
  const db = await getDb();
  const [row] = await db.insert(schema.newsletterIssues).values({ ...draft, status: "draft" }).returning();
  return row;
}

/** Newspaper-plain HTML email. Inline styles only; no images required. */
export function renderIssueHtml(issue: { subject: string; preheader: string | null; body: string }, opts: { unsubscribeUrl: string; manageUrl: string; webUrl?: string }) {
  const content = renderMarkdown(issue.body)
    .replace(/<h2(?: [^>]*)?>/g, `<h2 style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6b6b6b;margin:28px 0 8px;padding-top:12px;border-top:1px solid #d9d9d9">`)
    .replace(/<h3(?: [^>]*)?>/g, `<h3 style="font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.3;margin:14px 0 4px;font-weight:600">`)
    .replace(/<p(?: [^>]*)?>/g, `<p style="margin:0 0 10px;font-size:16px;line-height:1.55;color:#222">`)
    .replace(/<ul(?: [^>]*)?>/g, `<ul style="padding-left:18px;margin:0 0 10px;font-size:16px;line-height:1.6;color:#222">`)
    .replace(/<a /g, `<a style="color:#111;text-decoration:underline;text-underline-offset:3px" `);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(issue.subject)}</title></head>
<body style="margin:0;background:#f4f4f2;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
<span style="display:none;max-height:0;overflow:hidden;color:#f4f4f2">${escapeHtml(issue.preheader ?? "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e2e2e0">
<tr><td style="padding:22px 28px 14px;border-bottom:2px solid #111">
  <div style="font-size:12px;color:#6b6b6b;letter-spacing:.06em;text-transform:uppercase">${formatDate(new Date())}</div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;margin-top:4px">${escapeHtml(SITE.name)}<span style="color:#166534">.pk</span> <span style="font-size:18px;font-weight:400;color:#6b6b6b">Daily</span></div>
  <div style="font-size:14px;color:#6b6b6b;margin-top:2px;font-style:italic">${escapeHtml(SITE.tagline)}</div>
</td></tr>
<tr><td style="padding:8px 28px 24px">${content}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #d9d9d9;font-size:12px;color:#6b6b6b;line-height:1.6">
  You are receiving this because you subscribed at ${escapeHtml(SITE.url.replace(/^https?:\/\//, ""))}.
  <a href="${opts.manageUrl}" style="color:#6b6b6b">Change topics or frequency</a> · <a href="${opts.unsubscribeUrl}" style="color:#6b6b6b">Unsubscribe</a>${opts.webUrl ? ` · <a href="${opts.webUrl}" style="color:#6b6b6b">View on the web</a>` : ""}
  <br>${escapeHtml(SITE.name)} · Lahore, Pakistan
</td></tr>
</table></td></tr></table></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function plainTextOf(body: string) {
  return body
    .replace(/^#+\s*/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 — $2")
    .replace(/\*\*/g, "");
}

export async function sendTestIssue(issueId: string, to: string) {
  const db = await getDb();
  const issue = await db.query.newsletterIssues.findFirst({ where: eq(schema.newsletterIssues.id, issueId) });
  if (!issue) throw new Error("Issue not found");
  const html = renderIssueHtml(issue, { unsubscribeUrl: `${SITE.url}/newsletter/unsubscribe?token=test`, manageUrl: `${SITE.url}/newsletter/manage?token=test` });
  await sendEmail({ to, subject: `[TEST] ${issue.subject}`, html, text: plainTextOf(issue.body) });
}

/** Send an issue to every active subscriber on its frequency. Idempotent: refuses if already sent. */
export async function sendIssue(issueId: string) {
  const db = await getDb();
  const issue = await db.query.newsletterIssues.findFirst({ where: eq(schema.newsletterIssues.id, issueId) });
  if (!issue) throw new Error("Issue not found");
  if (issue.status === "sent") return { sent: 0, skipped: "already sent" as const };
  const recipients = await db.query.newsletterSubscribers.findMany({
    where: and(eq(schema.newsletterSubscribers.status, "active"), eq(schema.newsletterSubscribers.frequency, issue.frequency)),
    columns: { email: true, unsubscribeToken: true },
  });
  const text = plainTextOf(issue.body);
  let sent = 0;
  const failures: string[] = [];
  // Small batches keep the local outbox readable and stay under provider rate limits.
  for (let i = 0; i < recipients.length; i += 10) {
    await Promise.all(
      recipients.slice(i, i + 10).map(async (r) => {
        try {
          const html = renderIssueHtml(issue, { unsubscribeUrl: `${SITE.url}/newsletter/unsubscribe?token=${r.unsubscribeToken}`, manageUrl: `${SITE.url}/newsletter/manage?token=${r.unsubscribeToken}` });
          await sendEmail({ to: r.email, subject: issue.subject, html, text });
          sent += 1;
        } catch (e) {
          failures.push(`${r.email}: ${(e as Error).message}`);
        }
      }),
    );
  }
  await db.update(schema.newsletterIssues).set({ status: "sent", sentAt: new Date(), recipientCount: sent }).where(eq(schema.newsletterIssues.id, issueId));
  return { sent, failures };
}

/** Called by the cron endpoint: send every scheduled issue whose time has come. */
export async function sendDueIssues() {
  const db = await getDb();
  const due = await db.query.newsletterIssues.findMany({ where: and(eq(schema.newsletterIssues.status, "scheduled"), lte(schema.newsletterIssues.scheduledFor, new Date())), orderBy: [desc(schema.newsletterIssues.scheduledFor)] });
  const results = [];
  for (const issue of due) results.push({ id: issue.id, ...(await sendIssue(issue.id)) });
  return results;
}
