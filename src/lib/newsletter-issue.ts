import { and, asc, desc, eq, lte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { listArticles } from "@/db/queries/content";
import { listSeriesWithLatest } from "@/db/queries/data";
import { EmailBudgetExceeded, emailAllowance, sendEmail } from "./email";
import { formatDate, number } from "./format";
import { escapeHtml, renderMarkdown } from "./markdown";
import { trendingSearches } from "./search";
import { SITE } from "./utils";
import { TOOLS, toolUrl } from "@/tools/registry";
import { emailShell } from "@/lib/email-layout";

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
    const arrow = change > 0 ? "▲" : change < 0 ? "▼" : "=";
    const changeText = s.previous && change !== 0 ? ` (${arrow} ${number(Math.abs(change), s.unit === "%" ? 2 : 2)})` : "";
    return `- **${s.name.replace(/ today$/i, "")}:** ${number(s.latest!.value, 2)} ${s.unit}${changeText}, [history](${SITE.url}/data/${s.slug === "solar-panel-per-watt" ? "solar-panel-price" : s.slug})`;
  });

  const headline = stories[0];
  const subject = headline ? `${headline.title}` : `${SITE.name} ${frequency === "daily" ? "Daily" : "Weekly"}: ${formatDate(date)}`;
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

/** The issue in the site's email shell (ADR-52): masthead with the date, the markdown body, manage and unsubscribe links. */
export function renderIssueHtml(issue: { subject: string; preheader: string | null; body: string }, opts: { unsubscribeUrl: string; manageUrl: string; webUrl?: string; frequency?: string }) {
  const dateLine = `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">${escapeHtml(formatDate(new Date()))}</p>`;
  return emailShell({
    title: issue.subject,
    preheader: issue.preheader ?? undefined,
    kicker: opts.frequency === "weekly" ? "Weekly" : "Daily",
    body: dateLine + renderMarkdown(issue.body),
    footerNote: `You are receiving this because you subscribed at ${SITE.url.replace(/^https?:\/\//, "")}.`,
    footerLinks: [
      { label: "Change topics or frequency", href: opts.manageUrl },
      { label: "Unsubscribe", href: opts.unsubscribeUrl },
      ...(opts.webUrl ? [{ label: "View on the web", href: opts.webUrl }] : []),
    ],
  });
}

function plainTextOf(body: string) {
  return body
    .replace(/^#+\s*/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1, $2")
    .replace(/\*\*/g, "");
}

export async function sendTestIssue(issueId: string, to: string) {
  const db = await getDb();
  const issue = await db.query.newsletterIssues.findFirst({ where: eq(schema.newsletterIssues.id, issueId) });
  if (!issue) throw new Error("Issue not found");
  const html = renderIssueHtml(issue, { unsubscribeUrl: `${SITE.url}/newsletter/unsubscribe?token=test`, manageUrl: `${SITE.url}/newsletter/manage?token=test` });
  await sendEmail({ to, subject: `[TEST] ${issue.subject}`, html, text: plainTextOf(issue.body) });
}

/**
 * Send an issue to every active subscriber on its frequency. Idempotent and resumable: progress is kept in
 * settings (`newsletter:progress:<id>`), so when the daily email allowance runs out the issue stays
 * "scheduled" and the next run carries on from where it stopped. Marked "sent" only when everyone has it.
 */
export async function sendIssue(issueId: string) {
  const db = await getDb();
  const issue = await db.query.newsletterIssues.findFirst({ where: eq(schema.newsletterIssues.id, issueId) });
  if (!issue) throw new Error("Issue not found");
  if (issue.status === "sent") return { sent: 0, remaining: 0, skipped: "already sent" as const };
  const recipients = await db.query.newsletterSubscribers.findMany({
    where: and(eq(schema.newsletterSubscribers.status, "active"), eq(schema.newsletterSubscribers.frequency, issue.frequency)),
    columns: { email: true, unsubscribeToken: true },
    orderBy: [asc(schema.newsletterSubscribers.email)],
  });
  const progressKey = `newsletter:progress:${issueId}`;
  const progress = await db.query.settings.findFirst({ where: eq(schema.settings.key, progressKey) });
  let offset = Number((progress?.value as { offset?: number } | undefined)?.offset ?? 0);
  const text = plainTextOf(issue.body);
  let sent = 0;
  const failures: string[] = [];
  const allowance = await emailAllowance("bulk");
  const budget = Math.min(allowance.today, allowance.month);
  const end = Math.min(recipients.length, offset + budget);
  for (let i = offset; i < end; i += 10) {
    await Promise.all(
      recipients.slice(i, Math.min(i + 10, end)).map(async (r) => {
        try {
          const html = renderIssueHtml(issue, { unsubscribeUrl: `${SITE.url}/newsletter/unsubscribe?token=${r.unsubscribeToken}`, manageUrl: `${SITE.url}/newsletter/manage?token=${r.unsubscribeToken}`, frequency: issue.frequency });
          await sendEmail({ to: r.email, subject: issue.subject, html, text }, "bulk");
          sent += 1;
        } catch (e) {
          if (e instanceof EmailBudgetExceeded) return;
          failures.push(`${r.email}: ${(e as Error).message}`);
        }
      }),
    );
    offset = Math.min(i + 10, end);
  }
  const remaining = recipients.length - end;
  const previously = Number((progress?.value as { sent?: number } | undefined)?.sent ?? 0);
  if (remaining > 0) {
    await db.insert(schema.settings).values({ key: progressKey, value: { offset, sent: previously + sent } }).onConflictDoUpdate({ target: schema.settings.key, set: { value: { offset, sent: previously + sent }, updatedAt: new Date() } });
    return { sent, remaining, failures, paused: "daily email allowance reached; the rest goes out on the next run" as const };
  }
  await db.update(schema.newsletterIssues).set({ status: "sent", sentAt: new Date(), recipientCount: previously + sent }).where(eq(schema.newsletterIssues.id, issueId));
  if (progress) await db.delete(schema.settings).where(eq(schema.settings.key, progressKey));
  return { sent, remaining: 0, failures };
}

/** Called by the cron endpoint: send every scheduled issue whose time has come. */
export async function sendDueIssues() {
  const db = await getDb();
  const due = await db.query.newsletterIssues.findMany({ where: and(eq(schema.newsletterIssues.status, "scheduled"), lte(schema.newsletterIssues.scheduledFor, new Date())), orderBy: [desc(schema.newsletterIssues.scheduledFor)] });
  const results = [];
  for (const issue of due) results.push({ id: issue.id, ...(await sendIssue(issue.id)) });
  return results;
}
