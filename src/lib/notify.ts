import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, rawQuery, schema } from "@/db";
import { inviteUrl, layout } from "./claims";
import { escapeHtml } from "./markdown";
import { sendEmail } from "./email";
import { pkr } from "./format";
import { SITE } from "./utils";

/**
 * Who hears about what, and when. Enquiries and outbids go out at once (they are worth a reply now);
 * comments, replies, likes and bids on your own things arrive as one digest a day so a busy thread never
 * eats the email budget. Every send is transactional and stays inside the daily cap.
 */

/* ───────────── Preferences ───────────── */

export type NotifyKind = "leads" | "outbid" | "digest";
export const NOTIFY_KINDS: { kind: NotifyKind; label: string; description: string }[] = [
  { kind: "leads", label: "Enquiries", description: "Someone contacts a business or professional profile you own. Sent at once." },
  { kind: "outbid", label: "Outbid alerts", description: "Someone beats your bid on an auction. Sent at once." },
  { kind: "digest", label: "Daily activity", description: "One email a day, only when something happened: comments and replies on your posts, likes, bids on your auctions." },
];

/** Missing key means on; only an explicit false switches a kind off. */
export function prefOn(prefs: Record<string, boolean> | null | undefined, kind: NotifyKind) {
  return prefs?.[kind] !== false;
}

export async function wantsEmail(userId: string, kind: NotifyKind): Promise<boolean> {
  const db = await getDb();
  const u = await db.query.users.findFirst({ where: eq(schema.users.id, userId), columns: { notificationPrefs: true } });
  return prefOn(u?.notificationPrefs, kind);
}

export const manageLine = `<p style="color:#777;font-size:13px;margin-top:20px">Choose which emails you get at <a href="${SITE.url}/account/notifications">${SITE.url.replace(/^https?:\/\//, "")}/account/notifications</a>.</p>`;

/* ───────────── Enquiries ───────────── */

export async function notifyBusinessLead(businessId: string, lead: { name: string; phone: string; message: string }) {
  const db = await getDb();
  const b = await db.query.businesses.findFirst({ where: eq(schema.businesses.id, businessId), with: { owner: { columns: { email: true, name: true } } } });
  if (!b) return;
  const claimed = !!(b.claimedAt || b.ownerUserId);
  const to = claimed ? b.owner?.email : b.email && b.claimInviteCount < 99 ? b.email : null;
  if (!to) return;
  if (claimed && b.ownerUserId && !(await wantsEmail(b.ownerUserId, "leads"))) return;
  const body = `<p><strong>${escapeHtml(lead.name)}</strong> (${escapeHtml(lead.phone)}) sent this through your listing on ${SITE.name}:</p><blockquote style="margin:12px 0;padding:10px 14px;border-left:2px solid #111;color:#333">${escapeHtml(lead.message)}</blockquote>`;
  const tail = claimed
    ? `<p><a href="${SITE.url}/business/${b.id}">Open your dashboard</a> to see every enquiry.</p>`
    : `<p>This listing is not claimed yet, so enquiries only reach you by this email. <a href="${inviteUrl({ id: b.id, slug: b.slug, email: to })}">Claim it free</a> to reply from your dashboard, fix details and add photos. <a href="${SITE.url}/claim/opt-out?t=${inviteUrl({ id: b.id, slug: b.slug, email: to }).split("?t=")[1]}">No more emails</a>.</p>`;
  await sendEmail({ to, subject: `New enquiry for ${b.name}: ${lead.name}`, html: layout(`Enquiry for ${escapeHtml(b.name)}`, body + tail + (claimed ? manageLine : "")), text: `${lead.name} (${lead.phone}): ${lead.message}` }).catch(() => {});
}

export async function notifyProfessionalLead(professionalId: string, lead: { name: string; phone: string; email?: string | null; message?: string | null }) {
  const db = await getDb();
  const p = await db.query.professionals.findFirst({ where: eq(schema.professionals.id, professionalId), with: { owner: { columns: { email: true } } } });
  const to = p?.owner?.email ?? p?.email;
  if (!p || !to) return;
  if (p.ownerUserId && !(await wantsEmail(p.ownerUserId, "leads"))) return;
  await sendEmail({
    to,
    subject: `New enquiry: ${lead.name}`,
    html: layout(`Someone wants to reach you`, `<p><strong>${escapeHtml(lead.name)}</strong> (${escapeHtml(lead.phone)}${lead.email ? `, ${escapeHtml(lead.email)}` : ""}) sent this from your profile on ${SITE.name}:</p>${lead.message ? `<blockquote style="margin:12px 0;padding:10px 14px;border-left:2px solid #111;color:#333">${escapeHtml(lead.message)}</blockquote>` : ""}<p>Reply quickly; most people contact two or three professionals at once. <a href="${SITE.url}/professional">Your dashboard</a> keeps every enquiry.</p>${manageLine}`),
    text: `${lead.name} (${lead.phone}): ${lead.message ?? ""}`,
  }).catch(() => {});
}

/* ───────────── Auctions ───────────── */

/** The bidder who just lost the lead hears at once; the seller hears in the digest. */
export async function notifyOutbid(postId: string, newAmount: number, newBidderId: string) {
  const db = await getDb();
  const [prev] = await rawQuery<{ user_id: string }>(db, sql`select user_id from bids where post_id = ${postId} and user_id <> ${newBidderId} order by amount desc limit 1`);
  if (!prev) return;
  const [user, post] = await Promise.all([db.query.users.findFirst({ where: eq(schema.users.id, prev.user_id), columns: { email: true } }), db.query.posts.findFirst({ where: eq(schema.posts.id, postId), columns: { title: true, slug: true } })]);
  if (!user || !post) return;
  if (!(await wantsEmail(prev.user_id, "outbid"))) return;
  await sendEmail({ to: user.email, subject: `Outbid on ${post.title}`, html: layout(`You have been outbid`, `<p>Someone bid <strong>${pkr(newAmount)}</strong> on <a href="${SITE.url}/community/post/${post.slug}">${escapeHtml(post.title)}</a>. Bid again if you still want it.</p>${manageLine}`), text: `Outbid on ${post.title}: ${SITE.url}/community/post/${post.slug}` }).catch(() => {});
}

/* ───────────── Daily activity digest ───────────── */

type Item = { text: string; url: string };

/**
 * Once a day: for every member with something new on their posts or comments since the last run, one email
 * listing it. Runs from runDueJobs; a settings row keeps the high-water mark.
 */
export async function sendActivityDigests(): Promise<{ sent: number }> {
  const db = await getDb();
  const mark = await db.query.settings.findFirst({ where: eq(schema.settings.key, "digest:last") });
  const since = new Date((mark?.value as { at?: string } | undefined)?.at ?? Date.now() - 86400_000);
  if (Date.now() - since.getTime() < 20 * 3600_000) return { sent: 0 };
  const now = new Date();
  const byUser = new Map<string, Item[]>();
  const push = (userId: string, item: Item) => byUser.set(userId, [...(byUser.get(userId) ?? []), item]);

  // Comments on my posts (not my own comments).
  const postComments = await rawQuery<{ author_id: string; title: string; slug: string; n: number }>(db, sql`
    select p.author_id, p.title, p.slug, count(*)::int as n from comments c join posts p on p.id = c.target_id
    where c.target_type = 'post' and c.status = 'published' and c.created_at > ${since} and c.author_id <> p.author_id and c.parent_id is null
    group by p.author_id, p.title, p.slug`);
  for (const r of postComments) push(r.author_id, { text: `${r.n} new comment${r.n === 1 ? "" : "s"} on "${r.title}"`, url: `/community/post/${r.slug}#comments` });

  // Replies to my comments.
  const replies = await rawQuery<{ author_id: string; target_type: string; target_id: string; n: number }>(db, sql`
    select parent.author_id, parent.target_type, parent.target_id, count(*)::int as n from comments c join comments parent on parent.id = c.parent_id
    where c.status = 'published' and c.created_at > ${since} and c.author_id <> parent.author_id
    group by parent.author_id, parent.target_type, parent.target_id`);
  const postIds = replies.filter((r) => r.target_type === "post").map((r) => r.target_id);
  const articleIds = replies.filter((r) => r.target_type === "article").map((r) => r.target_id);
  const [posts, articles] = await Promise.all([
    postIds.length ? db.query.posts.findMany({ where: inArray(schema.posts.id, postIds), columns: { id: true, title: true, slug: true } }) : [],
    articleIds.length ? db.query.articles.findMany({ where: inArray(schema.articles.id, articleIds), columns: { id: true, title: true, slug: true, kind: true }, with: { category: { columns: { slug: true } } } }) : [],
  ]);
  for (const r of replies) {
    const p = posts.find((x) => x.id === r.target_id);
    const a = articles.find((x) => x.id === r.target_id);
    const title = p?.title ?? a?.title ?? "a discussion";
    const url = p ? `/community/post/${p.slug}#comments` : a ? `/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}#comments` : "/community";
    push(r.author_id, { text: `${r.n} repl${r.n === 1 ? "y" : "ies"} to your comment on "${title}"`, url });
  }

  // Likes on my posts.
  const likes = await rawQuery<{ author_id: string; title: string; slug: string; n: number }>(db, sql`
    select p.author_id, p.title, p.slug, count(*)::int as n from reactions r join posts p on p.id = r.target_id
    where r.target_type = 'post' and r.created_at > ${since} and r.user_id <> p.author_id group by p.author_id, p.title, p.slug`);
  for (const r of likes) push(r.author_id, { text: `${r.n} like${r.n === 1 ? "" : "s"} on "${r.title}"`, url: `/community/post/${r.slug}` });

  // Bids on my auctions.
  const bids = await rawQuery<{ author_id: string; title: string; slug: string; n: number; top: number }>(db, sql`
    select p.author_id, p.title, p.slug, count(*)::int as n, max(b.amount)::int as top from bids b join posts p on p.id = b.post_id
    where b.created_at > ${since} group by p.author_id, p.title, p.slug`);
  for (const r of bids) push(r.author_id, { text: `${r.n} new bid${r.n === 1 ? "" : "s"} on "${r.title}", highest ${pkr(r.top)}`, url: `/community/post/${r.slug}` });

  let sent = 0;
  if (byUser.size) {
    const users = await db.query.users.findMany({ where: inArray(schema.users.id, Array.from(byUser.keys())), columns: { id: true, email: true, name: true, notificationPrefs: true } });
    const banned = await db.query.memberProfiles.findMany({ where: and(inArray(schema.memberProfiles.userId, users.map((u) => u.id)), eq(schema.memberProfiles.isBanned, true)), columns: { userId: true } });
    const skip = new Set(banned.map((b) => b.userId));
    for (const u of users) {
      if (skip.has(u.id) || !prefOn(u.notificationPrefs, "digest")) continue;
      const items = byUser.get(u.id)!;
      try {
        await sendEmail({
          to: u.email,
          subject: items.length === 1 ? items[0].text : `${items.length} things happened on your posts`,
          html: layout(`While you were away`, `<ul style="padding-left:18px;line-height:1.7">${items.map((i) => `<li><a href="${SITE.url}${i.url}">${escapeHtml(i.text)}</a></li>`).join("")}</ul>${manageLine}`),
          text: items.map((i) => `${i.text}: ${SITE.url}${i.url}`).join("\n"),
        });
        sent += 1;
      } catch {
        break; // email budget exhausted; the mark is not advanced past what was sent
      }
    }
  }
  await db.insert(schema.settings).values({ key: "digest:last", value: { at: now.toISOString(), sent } }).onConflictDoUpdate({ target: schema.settings.key, set: { value: { at: now.toISOString(), sent }, updatedAt: now } });
  return { sent };
}
