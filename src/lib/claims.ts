import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb, rawQuery, schema } from "@/db";
import { emailAllowance, sendEmail } from "./email";
import { escapeHtml } from "./markdown";
import { SITE } from "./utils";

/**
 * Ownership claims for pre-listed businesses.
 *
 * A listing stays "unclaimed" until someone proves they run it. Four proofs, strongest first:
 *   invite        clicked the personal link we emailed to the address on the listing (auto-approved)
 *   email_domain  received a code at any mailbox on the listing's website domain (auto-approved)
 *   phone         sent the code to us by WhatsApp/SMS from the listed number, or took our call (editor confirms)
 *   document      uploaded an NTN/registration/utility bill/letterhead with the business name (editor reviews)
 * Approval sets the owner, marks the listing claimed and unlocks the dashboard, where the paid Verified badge lives.
 */

export type ClaimMethod = (typeof schema.claimMethod.enumValues)[number];
export type ClaimRole = "owner" | "manager" | "staff";

const CODE_TTL_MS = 24 * 3600_000;
const MAX_ATTEMPTS = 5;
const CLAIM_TTL_DAYS = 30;
const INVITE_TTL_DAYS = 60;

export const CLAIM_CONTACT = {
  whatsapp: process.env.CLAIM_WHATSAPP_NUMBER ?? "+92 300 0000000",
  email: process.env.EDITORIAL_EMAIL ?? "editorial@searchable.pk",
};

function secret(): string {
  return process.env.BETTER_AUTH_SECRET ?? "dev-secret";
}
function b64url(s: string) {
  return Buffer.from(s).toString("base64url");
}
function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}
function code6() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
export function domainOf(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".")) return null;
    // Shared mailbox providers prove nothing about the business.
    if (/^(gmail|yahoo|hotmail|outlook|live|icloud|proton|protonmail|facebook|instagram|wa)\./.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

/* ───────────── Invite links ───────────── */

/** Personal claim link for the email on the listing. Valid for 60 days, bound to that address. */
export function inviteToken(businessId: string, email: string): string {
  const exp = Date.now() + INVITE_TTL_DAYS * 86400_000;
  const payload = `${businessId}.${exp}.${b64url(email.toLowerCase())}`;
  return `${payload}.${sign(payload)}`;
}
export function readInviteToken(token: string): { businessId: string; email: string } | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [businessId, exp, emailB64, sig] = parts;
  const payload = `${businessId}.${exp}.${emailB64}`;
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now()) return null;
  return { businessId, email: Buffer.from(emailB64, "base64url").toString() };
}
export function inviteUrl(business: { id: string; slug: string; email: string }) {
  return `${SITE.url}/claim/${business.slug}?t=${inviteToken(business.id, business.email)}`;
}
export function optOutUrl(business: { id: string; email: string }) {
  return `${SITE.url}/claim/opt-out?t=${inviteToken(business.id, business.email)}`;
}

/* ───────────── Starting and proving a claim ───────────── */

export type StartClaimInput = {
  businessId: string;
  userId: string;
  method: ClaimMethod;
  role: ClaimRole;
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  message?: string;
  evidenceUrl?: string;
  /** email_domain: the mailbox name before @ (info, owner, …). */
  mailbox?: string;
  /** invite: the token from the emailed link. */
  inviteToken?: string;
};

export type ClaimError = { error: string };

export async function startClaim(input: StartClaimInput): Promise<{ claimId: string; status: string; method: ClaimMethod; sentTo?: string } | ClaimError> {
  const db = await getDb();
  const business = await db.query.businesses.findFirst({ where: eq(schema.businesses.id, input.businessId) });
  if (!business) return { error: "Listing not found" };
  if (business.claimedAt || business.ownerUserId) return { error: "This listing is already managed by its owner. If that is wrong, contact us and we will look into it." };
  const existing = await db.query.businessClaims.findFirst({ where: and(eq(schema.businessClaims.businessId, business.id), eq(schema.businessClaims.userId, input.userId)) });
  if (existing && existing.status === "pending") return { claimId: existing.id, status: existing.status, method: existing.method };
  if (existing && existing.status === "approved") return { error: "You already manage this listing." };

  const base = { businessId: business.id, userId: input.userId, method: input.method, role: input.role, contactName: input.contactName.slice(0, 120), contactPhone: input.contactPhone?.slice(0, 40) || null, contactEmail: input.contactEmail?.slice(0, 200) || null, message: input.message?.slice(0, 1000) || null, status: "pending" as const, codeAttempts: 0, verifiedAt: null as Date | null, reviewedAt: null as Date | null, reviewedBy: null as string | null, decisionNote: null as string | null };
  let values: typeof base & { evidenceUrl?: string | null; verificationCode?: string | null; codeExpiresAt?: Date | null } = base;
  let sentTo: string | undefined;

  if (input.method === "invite") {
    const t = input.inviteToken ? readInviteToken(input.inviteToken) : null;
    if (!t || t.businessId !== business.id || !business.email || t.email !== business.email.toLowerCase()) return { error: "This claim link is invalid or has expired. Ask us for a new one from the listing page." };
    values = { ...base, verifiedAt: new Date() };
  } else if (input.method === "email_domain") {
    const domain = domainOf(business.website);
    if (!domain) return { error: "This listing has no website domain we can email. Choose phone or document verification." };
    const mailbox = (input.mailbox ?? "").trim().toLowerCase().replace(/[^a-z0-9._+-]/g, "");
    if (!mailbox) return { error: "Enter the mailbox name, for example info or your first name." };
    const code = code6();
    sentTo = `${mailbox}@${domain}`;
    // The mailbox is the evidence; kept as a mailto: so the claim page and admin can show where the code went.
    values = { ...base, evidenceUrl: `mailto:${sentTo}`, verificationCode: code, codeExpiresAt: new Date(Date.now() + CODE_TTL_MS) };
    try {
      await sendEmail({
        to: sentTo,
        subject: `${code} is your ${SITE.name} verification code`,
        html: layout(`Verify ${escapeHtml(business.name)}`, `<p>Someone (${escapeHtml(input.contactName)}) is claiming <strong>${escapeHtml(business.name)}</strong> on ${SITE.name} and asked us to send the code to this mailbox.</p><p style="font-size:28px;letter-spacing:6px;font-family:monospace;margin:18px 0"><strong>${code}</strong></p><p>Enter it on the claim page within 24 hours. If this was not you, ignore this email; nothing changes without the code.</p>`),
        text: `Your ${SITE.name} verification code for ${business.name}: ${code} (valid 24 hours)`,
      });
    } catch (e) {
      return { error: `Could not send the code: ${(e as Error).message}` };
    }
  } else if (input.method === "phone") {
    if (!business.phone && !business.whatsapp) return { error: "This listing has no phone number. Choose document verification." };
    values = { ...base, verificationCode: code6(), codeExpiresAt: new Date(Date.now() + 7 * 86400_000) };
  } else {
    if (!input.evidenceUrl) return { error: "Upload one document that shows the business name." };
    values = { ...base, evidenceUrl: input.evidenceUrl };
  }

  const [row] = existing
    ? await db.update(schema.businessClaims).set({ ...values, createdAt: new Date() }).where(eq(schema.businessClaims.id, existing.id)).returning({ id: schema.businessClaims.id })
    : await db.insert(schema.businessClaims).values(values).returning({ id: schema.businessClaims.id });

  if (input.method === "invite") {
    await approveClaim(row.id, null, "Verified by the emailed invite link");
    return { claimId: row.id, status: "approved", method: input.method };
  }
  return { claimId: row.id, status: "pending", method: input.method, sentTo };
}

/** email_domain: the claimant types the code we sent. Five attempts, 24 hours. */
export async function confirmClaimCode(claimId: string, userId: string, code: string): Promise<{ ok: true } | ClaimError> {
  const db = await getDb();
  const c = await db.query.businessClaims.findFirst({ where: and(eq(schema.businessClaims.id, claimId), eq(schema.businessClaims.userId, userId)) });
  if (!c || c.status !== "pending" || c.method !== "email_domain") return { error: "Nothing to confirm" };
  if (!c.verificationCode || !c.codeExpiresAt || c.codeExpiresAt < new Date()) return { error: "The code has expired. Start the claim again to get a new one." };
  if (c.codeAttempts >= MAX_ATTEMPTS) return { error: "Too many attempts. Start the claim again to get a new code." };
  if (code.replace(/\D/g, "") !== c.verificationCode) {
    await db.update(schema.businessClaims).set({ codeAttempts: c.codeAttempts + 1 }).where(eq(schema.businessClaims.id, c.id));
    return { error: `That code is not right (${MAX_ATTEMPTS - c.codeAttempts - 1} attempts left).` };
  }
  await db.update(schema.businessClaims).set({ verifiedAt: new Date(), verificationCode: null }).where(eq(schema.businessClaims.id, c.id));
  await approveClaim(c.id, null, "Verified by a code sent to the website domain");
  return { ok: true };
}

/* ───────────── Decisions ───────────── */

export async function approveClaim(claimId: string, reviewerId: string | null, note?: string) {
  const db = await getDb();
  const c = await db.query.businessClaims.findFirst({ where: eq(schema.businessClaims.id, claimId), with: { business: true, user: true } });
  if (!c || c.status === "approved") return;
  const now = new Date();
  await db.update(schema.businessClaims).set({ status: "approved", verifiedAt: c.verifiedAt ?? now, reviewedBy: reviewerId, reviewedAt: now, decisionNote: note ?? null, verificationCode: null }).where(eq(schema.businessClaims.id, claimId));
  await db.update(schema.businesses).set({ ownerUserId: c.userId, claimedAt: now }).where(eq(schema.businesses.id, c.businessId));
  // Other pending claims on the same listing lose: the owner can add managers from the dashboard later.
  await db.update(schema.businessClaims).set({ status: "rejected", reviewedAt: now, decisionNote: "Another claim for this listing was approved" }).where(and(eq(schema.businessClaims.businessId, c.businessId), eq(schema.businessClaims.status, "pending")));
  if (c.user.role === "user") await db.update(schema.users).set({ role: "business_owner" }).where(eq(schema.users.id, c.userId));
  const to = c.contactEmail || c.user.email;
  await sendEmail({
    to,
    subject: `You now manage ${c.business.name} on ${SITE.name}`,
    html: layout(
      `${escapeHtml(c.business.name)} is yours`,
      `<p>Your claim is approved. From your dashboard you can update details and hours, add photos and services, answer enquiries and reply to reviews.</p>
       <p><a href="${SITE.url}/business/${c.business.id}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600">Open your dashboard</a></p>
       <p>Want the <strong>Verified</strong> badge? It shows customers the listing is checked, ranks you above free listings, and gives your website a followed link. It is Rs 9,900 a year, from the Upgrade tab in your dashboard.</p>`,
    ),
    text: `Your claim for ${c.business.name} is approved. Dashboard: ${SITE.url}/business/${c.business.id}`,
  }).catch(() => {});
}

export async function rejectClaim(claimId: string, reviewerId: string, note?: string) {
  const db = await getDb();
  const c = await db.query.businessClaims.findFirst({ where: eq(schema.businessClaims.id, claimId), with: { business: true, user: true } });
  if (!c || c.status !== "pending") return;
  await db.update(schema.businessClaims).set({ status: "rejected", reviewedBy: reviewerId, reviewedAt: new Date(), decisionNote: note ?? null, verificationCode: null }).where(eq(schema.businessClaims.id, claimId));
  await sendEmail({
    to: c.contactEmail || c.user.email,
    subject: `About your claim for ${c.business.name}`,
    html: layout(`We could not verify this claim`, `<p>We were not able to confirm that you run <strong>${escapeHtml(c.business.name)}</strong>.${note ? ` ${escapeHtml(note)}` : ""}</p><p>You can try again with a different proof: a code sent to your website's email, a WhatsApp message from the listed number, or a document showing the business name. <a href="${SITE.url}/claim/${c.business.slug}">Claim again</a>, or reply to this email if you think we got it wrong.</p>`),
    text: `We could not verify your claim for ${c.business.name}. ${note ?? ""} Try again: ${SITE.url}/claim/${c.business.slug}`,
  }).catch(() => {});
}

/** Pending claims older than 30 days are closed as expired (daily job). */
export async function expireStaleClaims(): Promise<number> {
  const db = await getDb();
  const rows = await db.update(schema.businessClaims).set({ status: "expired", reviewedAt: new Date(), decisionNote: "No proof received within 30 days" }).where(and(eq(schema.businessClaims.status, "pending"), lt(schema.businessClaims.createdAt, new Date(Date.now() - CLAIM_TTL_DAYS * 86400_000)))).returning({ id: schema.businessClaims.id });
  return rows.length;
}

/* ───────────── Outreach: invite listed businesses to claim ───────────── */

export type OutreachStats = { active: number; withEmail: number; invited: number; claimed: number; optedOut: number; eligible: number; enabled: boolean; lastRun: string | null; lastSent: number };

export async function outreachStats(): Promise<OutreachStats> {
  const db = await getDb();
  const [r] = await rawQuery<Record<string, number>>(
    db,
    sql`select
      (select count(*) from businesses where status = 'active')::int as active,
      (select count(*) from businesses where status = 'active' and email is not null and email <> '')::int as with_email,
      (select count(*) from businesses where status = 'active' and claim_invite_sent_at is not null and claim_invite_count < 99)::int as invited,
      (select count(*) from businesses where status = 'active' and claimed_at is not null)::int as claimed,
      (select count(*) from businesses where claim_invite_count >= 99)::int as opted_out,
      (select count(*) from businesses where status = 'active' and email is not null and email <> '' and claimed_at is null and owner_user_id is null and (claim_invite_sent_at is null or (claim_invite_count < 2 and claim_invite_sent_at < now() - interval '14 days')))::int as eligible`,
  );
  const setting = await db.query.settings.findFirst({ where: eq(schema.settings.key, "outreach:state") });
  const st = (setting?.value as { enabled?: boolean; lastRun?: string; lastSent?: number } | undefined) ?? {};
  return { active: r?.active ?? 0, withEmail: r?.with_email ?? 0, invited: r?.invited ?? 0, claimed: r?.claimed ?? 0, optedOut: r?.opted_out ?? 0, eligible: r?.eligible ?? 0, enabled: !!st.enabled, lastRun: st.lastRun ?? null, lastSent: st.lastSent ?? 0 };
}

export async function setOutreachEnabled(enabled: boolean) {
  const db = await getDb();
  const cur = await db.query.settings.findFirst({ where: eq(schema.settings.key, "outreach:state") });
  const value = { ...((cur?.value as object | undefined) ?? {}), enabled };
  await db.insert(schema.settings).values({ key: "outreach:state", value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
}

/** Businesses that qualify for an invite (first, or one reminder after 14 days), best-known first. */
export async function eligibleForInvite(limit: number) {
  const db = await getDb();
  const fortnightAgo = new Date(Date.now() - 14 * 86400_000);
  return db.query.businesses.findMany({
    where: and(
      eq(schema.businesses.status, "active"),
      isNull(schema.businesses.claimedAt),
      isNull(schema.businesses.ownerUserId),
      sql`${schema.businesses.email} is not null and ${schema.businesses.email} <> ''`,
      or(isNull(schema.businesses.claimInviteSentAt), and(lt(schema.businesses.claimInviteCount, 2), lt(schema.businesses.claimInviteSentAt, fortnightAgo))),
    ),
    orderBy: [asc(schema.businesses.claimInviteCount), desc(schema.businesses.ratingCount), desc(schema.businesses.viewCount)],
    limit,
    with: { primaryCategory: true, city: true },
  });
}

export function renderInvite(b: { id: string; slug: string; name: string; email: string; claimInviteCount: number; primaryCategory?: { name: string } | null; city?: { name: string } | null; viewCount: number }) {
  const reminder = b.claimInviteCount > 0;
  const url = inviteUrl(b);
  const subject = reminder ? `Reminder: ${b.name} is listed on ${SITE.name}, is it yours?` : `${b.name} is on ${SITE.name}. Claim your free listing`;
  const html = layout(
    reminder ? `Still unclaimed: ${escapeHtml(b.name)}` : `Is ${escapeHtml(b.name)} yours?`,
    `<p>${SITE.name} lists <strong>${escapeHtml(b.name)}</strong>${b.primaryCategory ? ` under ${escapeHtml(b.primaryCategory.name)}` : ""}${b.city ? ` in ${escapeHtml(b.city.name)}` : ""}, with the phone number, address and hours we could find${b.viewCount ? `; it has been viewed ${b.viewCount.toLocaleString()} times` : ""}.</p>
     <p>The listing is free and stays free. Claiming it takes a minute and lets you correct details, add photos and services, get enquiries by WhatsApp and reply to reviews. This link is personal to this email address, so no code or paperwork is needed:</p>
     <p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;text-decoration:none;font-weight:600">Claim ${escapeHtml(b.name)}</a></p>
     <p style="color:#555;font-size:14px">Once claimed, you can also get the Verified badge (Rs 9,900 a year), which ranks you above free listings and links to your website. Entirely optional.</p>
     <p style="color:#777;font-size:13px">See the listing: <a href="${SITE.url}/b/${b.slug}">${SITE.url}/b/${b.slug}</a>. Not your business, or prefer we did not write again? <a href="${optOutUrl(b)}">One click and we will not email this address again</a>.</p>`,
  );
  const text = `${b.name} is listed on ${SITE.name}. Claim it (free): ${url}\nNot yours or no more emails: ${optOutUrl(b)}`;
  return { subject, html, text };
}

/** Sends invites within today's bulk email allowance. Runs once a day from runDueJobs when enabled. */
export async function sendClaimInvites(opts: { limit?: number; force?: boolean } = {}): Promise<{ sent: number; skipped: string }> {
  const db = await getDb();
  const setting = await db.query.settings.findFirst({ where: eq(schema.settings.key, "outreach:state") });
  const st = (setting?.value as { enabled?: boolean; lastRun?: string; lastSent?: number } | undefined) ?? {};
  if (!st.enabled && !opts.force) return { sent: 0, skipped: "outreach is off" };
  if (!opts.force && st.lastRun && Date.now() - new Date(st.lastRun).getTime() < 20 * 3600_000) return { sent: 0, skipped: "already ran today" };
  const allowance = await emailAllowance("bulk");
  const budget = Math.min(allowance.today, allowance.month, opts.limit ?? 60);
  const targets = budget > 0 ? await eligibleForInvite(budget) : [];
  let sent = 0;
  for (const b of targets) {
    if (!b.email) continue;
    try {
      const mail = renderInvite({ ...b, email: b.email });
      await sendEmail({ to: b.email, ...mail }, "bulk");
      await db.update(schema.businesses).set({ claimInviteSentAt: new Date(), claimInviteCount: b.claimInviteCount + 1 }).where(eq(schema.businesses.id, b.id));
      sent += 1;
    } catch {
      break; // budget exhausted or provider down; try again tomorrow
    }
  }
  const value = { enabled: !!st.enabled, lastRun: new Date().toISOString(), lastSent: sent };
  await db.insert(schema.settings).values({ key: "outreach:state", value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  return { sent, skipped: sent ? "" : budget > 0 ? "nothing eligible" : "no email allowance left today" };
}

/** Opt-out link from the invite: never email this listing again. */
export async function optOut(token: string): Promise<boolean> {
  const t = readInviteToken(token);
  if (!t) return false;
  const db = await getDb();
  await db.update(schema.businesses).set({ claimInviteCount: 99 }).where(eq(schema.businesses.id, t.businessId));
  return true;
}

/* ───────────── Email chrome ───────────── */

export function layout(title: string, body: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;line-height:1.6;color:#111">
  <p style="font-family:Georgia,serif;font-size:20px;margin:0 0 18px;padding-bottom:10px;border-bottom:2px solid #111">${SITE.name}<span style="color:#888">.pk</span></p>
  <h1 style="font-family:Georgia,serif;font-size:24px;line-height:1.25;margin:0 0 12px">${title}</h1>
  ${body}
  <p style="color:#888;font-size:12px;margin-top:28px;padding-top:10px;border-top:1px solid #ddd">${SITE.name}, ${SITE.url.replace(/^https?:\/\//, "")}</p>
</div>`;
}
