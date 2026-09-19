import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { NEWSLETTER_TOPICS, type NewsletterTopic } from "@/db/schema/newsletter";
import { sendEmail } from "./email";
import { SITE } from "./utils";
import { track } from "@/lib/track";

function token() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function subscribe(input: { email: string; name?: string; topics?: string[]; frequency?: "daily" | "weekly"; source?: string }) {
  const db = await getDb();
  track("newsletter_subscribe", { blobs: [input.source ?? "", input.frequency ?? "daily", (input.topics ?? []).join(",")] });
  const email = input.email.trim().toLowerCase();
  const topics = (input.topics ?? []).filter((t): t is NewsletterTopic => (NEWSLETTER_TOPICS as readonly string[]).includes(t));
  const existing = await db.query.newsletterSubscribers.findFirst({ where: eq(schema.newsletterSubscribers.email, email) });

  if (existing?.status === "active") {
    if (topics.length || input.frequency) {
      await db
        .update(schema.newsletterSubscribers)
        .set({ topics: topics.length ? topics : existing.topics, frequency: input.frequency ?? existing.frequency })
        .where(eq(schema.newsletterSubscribers.id, existing.id));
    }
    return { status: "already_active" as const };
  }

  const confirmToken = token();
  if (existing) {
    await db
      .update(schema.newsletterSubscribers)
      .set({ status: "pending", confirmToken, topics, frequency: input.frequency ?? "daily", name: input.name ?? existing.name, source: input.source ?? existing.source })
      .where(eq(schema.newsletterSubscribers.id, existing.id));
  } else {
    await db.insert(schema.newsletterSubscribers).values({
      email,
      name: input.name,
      topics,
      frequency: input.frequency ?? "daily",
      source: input.source,
      confirmToken,
      unsubscribeToken: token(),
    });
  }

  const confirmUrl = `${SITE.url}/newsletter/confirm?token=${confirmToken}`;
  await sendEmail({
    to: email,
    subject: `Confirm your ${SITE.name} Daily subscription`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;line-height:1.6">
      <h1 style="font-size:22px;margin:0 0 12px">One click to confirm</h1>
      <p>Thanks for subscribing to <strong>${SITE.name} Daily</strong> - the useful morning email about Pakistan.</p>
      <p><a href="${confirmUrl}" style="display:inline-block;background:#166534;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Confirm subscription</a></p>
      <p style="color:#666;font-size:14px">If you did not request this, ignore this email.</p>
    </div>`,
    text: `Confirm your subscription: ${confirmUrl}`,
  });
  return { status: "pending" as const };
}

export async function confirm(tokenValue: string) {
  const db = await getDb();
  const sub = await db.query.newsletterSubscribers.findFirst({ where: eq(schema.newsletterSubscribers.confirmToken, tokenValue) });
  if (!sub) return false;
  await db
    .update(schema.newsletterSubscribers)
    .set({ status: "active", confirmedAt: new Date(), confirmToken: null })
    .where(eq(schema.newsletterSubscribers.id, sub.id));
  return true;
}

export async function unsubscribe(tokenValue: string) {
  const db = await getDb();
  const sub = await db.query.newsletterSubscribers.findFirst({ where: eq(schema.newsletterSubscribers.unsubscribeToken, tokenValue) });
  if (!sub) return false;
  await db.update(schema.newsletterSubscribers).set({ status: "unsubscribed", unsubscribedAt: new Date() }).where(eq(schema.newsletterSubscribers.id, sub.id));
  return true;
}
