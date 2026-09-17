import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { layout } from "./claims";
import { escapeHtml } from "./markdown";
import { sendEmail } from "./email";
import { SITE } from "./utils";

/**
 * Shared inbox for *@searchable.pk. Resend receives the mail (MX on the domain); we mirror each message
 * into `inbox_messages` so admin has read state, filters and a copy that outlives the provider's retention.
 * Two ways in: the `email.received` webhook (instant) and `syncInbox()` from the job runner (catches anything
 * the webhook missed). Bodies are small; HTML and attachments are fetched from Resend when opened.
 */
const API = "https://api.resend.com";
const TEXT_CAP = 20_000;
const SYNC_DETAIL_CAP = 25;
export const INBOX_STATUSES = ["new", "replied", "archived", "all"] as const;

type ReceivedSummary = { id: string; from: string; to: string[]; cc?: string[]; reply_to?: string[]; subject: string; created_at: string; message_id?: string; attachments?: { id: string; filename: string; content_type: string; size: number }[] };
type ReceivedDetail = ReceivedSummary & { html?: string | null; text?: string | null; headers?: Record<string, string> };
type Attachment = { id: string; filename: string; content_type: string; size: number; download_url: string; expires_at: string };

export function inboxEnabled() {
  return process.env.EMAIL_PROVIDER === "resend" && !!process.env.RESEND_API_KEY;
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Resend ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

/** "Name <a@b.c>" → { name, address }. */
export function parseAddress(s: string): { name: string | null; address: string } {
  const m = /^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/.exec(s);
  if (m) return { name: m[1]?.trim() || null, address: m[2].trim().toLowerCase() };
  return { name: null, address: s.trim().toLowerCase() };
}

export const INBOX_DOMAIN = (process.env.EMAIL_FROM ?? "daily@searchable.pk").match(/@([a-z0-9.-]+)/i)?.[1]?.toLowerCase() ?? "searchable.pk";

/** Which of our addresses it was sent to (first match on our domain), else the first recipient's local part. */
function mailboxFor(to: string[], cc: string[] = []) {
  const all = [...to, ...cc].map((a) => parseAddress(a).address);
  const ours = all.find((a) => a.endsWith(`@${INBOX_DOMAIN}`)) ?? all[0] ?? `unknown@${INBOX_DOMAIN}`;
  return ours.split("@")[0];
}

function snippetOf(text: string | null | undefined, html: string | null | undefined) {
  const src = text?.trim() || html?.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ") || "";
  return src
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

/** Upsert one received email from its detail record. Returns true when it was new. */
async function storeReceived(d: ReceivedDetail): Promise<boolean> {
  const db = await getDb();
  const from = parseAddress(d.from);
  const text = d.text ? d.text.slice(0, TEXT_CAP) : d.html ? snippetOf(null, d.html).slice(0, TEXT_CAP) : null;
  const inserted = await db
    .insert(schema.inboxMessages)
    .values({
      id: d.id,
      mailbox: mailboxFor(d.to ?? [], d.cc ?? []),
      fromAddress: from.address,
      fromName: from.name,
      to: d.to ?? [],
      cc: d.cc ?? [],
      replyTo: d.reply_to ?? [],
      subject: d.subject?.trim() || "(no subject)",
      snippet: snippetOf(d.text, d.html),
      text,
      hasHtml: d.html ? 1 : 0,
      messageId: d.message_id ?? d.headers?.["message-id"] ?? null,
      inReplyTo: d.headers?.["in-reply-to"] ?? null,
      attachments: (d.attachments ?? []).map((a) => ({ id: a.id, filename: a.filename, contentType: a.content_type, size: a.size })),
      receivedAt: new Date(d.created_at),
    })
    .onConflictDoNothing()
    .returning({ id: schema.inboxMessages.id });
  return inserted.length > 0;
}

/** Fetch one received email from Resend and mirror it. Used by the webhook. */
export async function ingestReceived(id: string): Promise<boolean> {
  if (!inboxEnabled()) return false;
  const d = await api<ReceivedDetail>(`/emails/receiving/${encodeURIComponent(id)}`);
  return storeReceived(d);
}

/**
 * Pull the latest received list and mirror anything we have not seen. One list call plus one detail call
 * per new message (capped), so a 5-minute cadence costs almost nothing.
 */
export async function syncInbox(): Promise<{ added: number; skipped?: string }> {
  if (!inboxEnabled()) return { added: 0, skipped: "email provider is not resend" };
  const list = await api<{ data: ReceivedSummary[] }>("/emails/receiving?limit=50");
  const ids = list.data.map((m) => m.id);
  if (!ids.length) return { added: 0 };
  const db = await getDb();
  const known = new Set((await db.select({ id: schema.inboxMessages.id }).from(schema.inboxMessages).where(inArray(schema.inboxMessages.id, ids))).map((r) => r.id));
  let added = 0;
  for (const id of ids.filter((i) => !known.has(i)).slice(0, SYNC_DETAIL_CAP)) {
    const d = await api<ReceivedDetail>(`/emails/receiving/${encodeURIComponent(id)}`);
    if (await storeReceived(d)) added += 1;
  }
  await db.insert(schema.settings).values({ key: "inbox:last", value: { at: new Date().toISOString(), added } }).onConflictDoUpdate({ target: schema.settings.key, set: { value: { at: new Date().toISOString(), added }, updatedAt: new Date() } });
  return { added };
}

/** HTML body, fetched live (never stored). Rendered in a sandboxed iframe by the admin page. */
export async function fetchInboxHtml(id: string): Promise<string | null> {
  if (!inboxEnabled()) return null;
  const d = await api<ReceivedDetail>(`/emails/receiving/${encodeURIComponent(id)}?html_format=data_uri`);
  return d.html ?? null;
}

/** Short-lived signed download URL for an attachment. */
export async function attachmentDownloadUrl(emailId: string, attachmentId: string): Promise<{ url: string; filename: string; contentType: string } | null> {
  if (!inboxEnabled()) return null;
  const a = await api<Attachment>(`/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`);
  return { url: a.download_url, filename: a.filename, contentType: a.content_type };
}

export async function listInbox(opts: { status?: string; mailbox?: string; q?: string; limit?: number }) {
  const db = await getDb();
  const where = [];
  if (opts.status && opts.status !== "all") where.push(eq(schema.inboxMessages.status, opts.status));
  if (opts.mailbox) where.push(eq(schema.inboxMessages.mailbox, opts.mailbox));
  if (opts.q) where.push(sql`(${schema.inboxMessages.subject} ilike ${"%" + opts.q + "%"} or ${schema.inboxMessages.fromAddress} ilike ${"%" + opts.q + "%"} or ${schema.inboxMessages.snippet} ilike ${"%" + opts.q + "%"})`);
  return db.query.inboxMessages.findMany({ where: where.length ? and(...where) : undefined, orderBy: [desc(schema.inboxMessages.receivedAt)], limit: opts.limit ?? 100 });
}

export async function inboxCounts() {
  const db = await getDb();
  const [byStatus, byMailbox] = await Promise.all([
    db.select({ status: schema.inboxMessages.status, n: sql<number>`count(*)::int` }).from(schema.inboxMessages).groupBy(schema.inboxMessages.status),
    db.select({ mailbox: schema.inboxMessages.mailbox, n: sql<number>`count(*)::int` }).from(schema.inboxMessages).groupBy(schema.inboxMessages.mailbox).orderBy(sql`count(*) desc`),
  ]);
  const status = (s: string) => (s === "all" ? byStatus.reduce((a, c) => a + c.n, 0) : (byStatus.find((c) => c.status === s)?.n ?? 0));
  return { status, mailboxes: byMailbox };
}

export async function getInboxMessage(id: string) {
  const db = await getDb();
  return db.query.inboxMessages.findFirst({ where: eq(schema.inboxMessages.id, id) });
}

export async function markInboxRead(id: string) {
  const db = await getDb();
  await db.update(schema.inboxMessages).set({ readAt: new Date() }).where(and(eq(schema.inboxMessages.id, id), sql`${schema.inboxMessages.readAt} is null`));
}

export async function setInboxStatus(id: string, status: "new" | "replied" | "archived") {
  const db = await getDb();
  await db.update(schema.inboxMessages).set({ status }).where(eq(schema.inboxMessages.id, id));
}

/**
 * Reply from the mailbox the message arrived at, threaded with In-Reply-To/References and the original
 * quoted below, so it reads like any mail client's reply. Counts against the transactional email budget.
 */
export async function replyToInboxMessage(id: string, body: string, signedBy: string): Promise<{ id: string }> {
  const m = await getInboxMessage(id);
  if (!m) throw new Error("Message not found");
  const to = m.replyTo[0] ? parseAddress(m.replyTo[0]).address : m.fromAddress;
  const from = `${SITE.name} <${m.mailbox}@${INBOX_DOMAIN}>`;
  const subject = /^re:/i.test(m.subject) ? m.subject : `Re: ${m.subject}`;
  const quoted = (m.text ?? m.snippet)
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  const text = `${body.trim()}\n\n${signedBy}\n${SITE.name}\n\nOn ${m.receivedAt.toUTCString()}, ${m.fromName ?? m.fromAddress} wrote:\n${quoted}`;
  const html = layout(
    subject,
    `<div style="white-space:pre-wrap">${escapeHtml(body.trim())}</div>
     <p style="margin-top:18px">${escapeHtml(signedBy)}<br><span style="color:#888">${SITE.name}</span></p>
     <p style="color:#888;font-size:12px;margin-top:24px">On ${escapeHtml(m.receivedAt.toUTCString())}, ${escapeHtml(m.fromName ?? m.fromAddress)} wrote:</p>
     <blockquote style="margin:0;padding-left:12px;border-left:2px solid #ddd;color:#555;white-space:pre-wrap">${escapeHtml(m.text ?? m.snippet)}</blockquote>`,
  );
  const headers: Record<string, string> = {};
  if (m.messageId) {
    headers["In-Reply-To"] = m.messageId;
    headers["References"] = m.messageId;
  }
  const sent = await sendEmail({ to, subject, html, text, from, headers }, "transactional");
  const db = await getDb();
  await db.update(schema.inboxMessages).set({ status: "replied", repliedAt: new Date(), readAt: m.readAt ?? new Date() }).where(eq(schema.inboxMessages.id, id));
  return sent;
}

/**
 * Svix-style signature check for Resend webhooks: secret `whsec_<base64>`, signed content
 * `${id}.${timestamp}.${body}`, HMAC-SHA256 in base64, header `v1,<sig> v1,<sig>`; five-minute skew.
 */
export function verifyResendWebhook(headers: Headers, rawBody: string, secret = process.env.RESEND_WEBHOOK_SECRET): boolean {
  if (!secret) return false;
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigs = headers.get("svix-signature");
  if (!id || !ts || !sigs) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${rawBody}`).digest();
  return sigs.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
