"use server";

import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getProduct } from "@/content/pricing";
import { getSessionUser, requireRole, requireUser } from "@/lib/auth";
import { canViewOrder, createOrder, markPaid, orderPath } from "@/lib/commerce";
import { escapeHtml } from "@/lib/markdown";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { TURNSTILE_ERROR, TURNSTILE_FIELD, verifyTurnstile } from "@/lib/turnstile";
import { sendEmail } from "@/lib/email";
import { SITE } from "@/lib/utils";

/* ───────────── Business owner: buy a plan ───────────── */
const BuyPlan = z.object({ businessId: z.string().min(1), productCode: z.string().min(1), phone: z.string().trim().max(30).optional() });

export async function buyPlanAction(formData: FormData) {
  const user = await requireUser("/business");
  const d = BuyPlan.parse(Object.fromEntries(formData));
  const product = getProduct(d.productCode);
  if (!product || product.kind === "sponsored_post") throw new Error("Unknown plan");
  const db = await getDb();
  const claims = await db.query.businessClaims.findMany({ where: and(eq(schema.businessClaims.userId, user.id), eq(schema.businessClaims.status, "approved")), columns: { businessId: true } });
  const biz = await db.query.businesses.findFirst({ where: and(eq(schema.businesses.id, d.businessId), or(eq(schema.businesses.ownerUserId, user.id), ...(claims.length ? [eq(schema.businesses.id, claims[0].businessId)] : []))) });
  if (!biz) throw new Error("You do not manage this business");
  const order = await createOrder({ productCode: product.code, userId: user.id, businessId: biz.id, payer: { name: user.name ?? user.email, email: user.email, phone: d.phone }, notes: `${product.name} for ${biz.name}` });
  redirect(orderPath(order.invoiceNo));
}

const BuyProPlan = z.object({ professionalId: z.string().min(1), productCode: z.string().min(1), phone: z.string().trim().max(20).optional() });

/** Verified professional plan: only the profile's owner can buy it. */
export async function buyProfessionalPlanAction(formData: FormData) {
  const user = await requireUser("/professional");
  const d = BuyProPlan.parse(Object.fromEntries(formData));
  const product = getProduct(d.productCode);
  if (!product || product.kind !== "professional_plan") throw new Error("Unknown plan");
  const db = await getDb();
  const pro = await db.query.professionals.findFirst({ where: and(eq(schema.professionals.id, d.professionalId), eq(schema.professionals.ownerUserId, user.id)) });
  if (!pro) throw new Error("You do not manage this profile");
  const order = await createOrder({ productCode: product.code, userId: user.id, professionalId: pro.id, payer: { name: user.name ?? user.email, email: user.email, phone: d.phone }, notes: `${product.name} for ${pro.name}` });
  redirect(orderPath(order.invoiceNo));
}

/* ───────────── Payer: attach a payment reference ───────────── */
const Reference = z.object({ invoiceNo: z.string().min(5), k: z.string().max(40).optional(), reference: z.string().trim().min(3).max(120), provider: z.enum(["manual", "jazzcash", "easypaisa"]).default("manual") });

export async function submitPaymentReferenceAction(formData: FormData) {
  const rl = await rateLimit("payment-ref", 10, 60 * 60_000);
  if (!rl.ok) return { error: "Too many attempts. Try again later." };
  const parsed = Reference.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter the transaction ID." };
  const d = parsed.data;
  const db = await getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.invoiceNo, d.invoiceNo) });
  if (!order || !canViewOrder(order, await getSessionUser(), d.k)) return { error: "Invoice not found." };
  if (order.status !== "pending") return { error: "This invoice is already settled." };
  await db.update(schema.orders).set({ paymentReference: d.reference, provider: d.provider }).where(eq(schema.orders.id, order.id));
  await sendEmail({ to: process.env.BILLING_EMAIL ?? "billing@searchable.pk", subject: `Payment reference on ${order.invoiceNo}`, html: `<p>${escapeHtml(order.payerName ?? "")} says they paid ${escapeHtml(order.productName)} via ${d.provider}: <strong>${escapeHtml(d.reference)}</strong>. Confirm in <a href="${SITE.url}/admin/orders">admin</a>.</p>`, text: `${order.invoiceNo}: ${d.provider} ${d.reference}` });
  revalidatePath(`/orders/${d.invoiceNo}`);
  return { ok: true };
}

/* ───────────── Admin: orders ───────────── */
export async function markPaidAction(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const reference = String(formData.get("reference") ?? "").trim() || undefined;
  await markPaid(id, { reference });
  revalidatePath("/admin/orders");
  revalidatePath("/business");
}

export async function cancelOrderAction(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  await db.update(schema.orders).set({ status: "cancelled" }).where(and(eq(schema.orders.id, id), eq(schema.orders.status, "pending")));
  revalidatePath("/admin/orders");
}

/* ───────────── Public: write for us / sponsored post pitch ───────────── */
const Submission = z.object({
  kind: z.enum(["guest", "sponsored", "press_release"]),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().max(30).optional(),
  company: z.string().trim().max(120).optional(),
  website: z.string().trim().max(200).optional(),
  title: z.string().trim().min(8).max(160),
  category: z.string().trim().max(60).optional(),
  body: z.string().trim().min(200).max(20_000),
  links: z.string().trim().max(1000).optional(),
  // honeypot
  company_url: z.string().max(0).optional(),
});

export async function submitPitchAction(raw: Record<string, string>): Promise<{ ok: true; id: string; invoiceNo?: string; invoicePath?: string } | { ok: false; error: string }> {
  const rl = await rateLimit("pitch", 5, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: "Too many submissions from this connection. Try again in an hour." };
  if (!(await verifyTurnstile(raw[TURNSTILE_FIELD]))) return { ok: false, error: TURNSTILE_ERROR };
  const parsed = Submission.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  const user = await getSessionUser();
  const db = await getDb();
  const links = (d.links ?? "")
    .split(/\s+/)
    .filter((u) => /^https?:\/\//i.test(u))
    .slice(0, 5)
    .map((url) => ({ url }));
  const [row] = await db
    .insert(schema.submissions)
    .values({ kind: d.kind, name: d.name, email: d.email.toLowerCase(), phone: d.phone || null, company: d.company || null, website: d.website || null, title: d.title, category: d.category || null, body: d.body, links, userId: user?.id ?? null, ip: await clientIp() })
    .returning();

  let invoiceNo: string | undefined;
  if (d.kind !== "guest") {
    const order = await createOrder({ productCode: d.kind === "sponsored" ? "sponsored-post" : "press-release", userId: user?.id ?? null, submissionId: row.id, payer: { name: d.name, email: d.email, phone: d.phone }, notes: d.title });
    invoiceNo = order.invoiceNo;
  }
  const invoicePath = invoiceNo ? orderPath(invoiceNo) : undefined;
  const e = { name: escapeHtml(d.name), title: escapeHtml(d.title), company: escapeHtml(d.company ?? ""), email: escapeHtml(d.email) };
  await sendEmail({ to: process.env.EDITORIAL_EMAIL ?? "editorial@searchable.pk", subject: `[${d.kind}] ${d.title}`, html: `<p>${e.name} (${e.email}${e.company ? `, ${e.company}` : ""}) pitched: <strong>${e.title}</strong>. Review in <a href="${SITE.url}/admin/submissions">admin</a>.</p>`, text: `${d.name} pitched ${d.title}` });
  await sendEmail({
    to: d.email,
    subject: d.kind === "guest" ? `We got your pitch: ${SITE.name}` : `Your ${d.kind === "sponsored" ? "sponsored article" : "press release"}: next steps`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;line-height:1.6"><p>Thanks, ${e.name}. We received “${e.title}”.</p>${invoiceNo ? `<p>Your invoice is <strong>${invoiceNo}</strong>. Payment details and status: <a href="${SITE.url}${invoicePath}">${SITE.url}/orders/${invoiceNo}</a>. We start editing once payment is confirmed and publish within 5 working days.</p>` : `<p>An editor reads every pitch within 5 working days. If it fits, we reply with edits or a publication date; if not, we say so.</p>`}</div>`,
    text: `Thanks, we received "${d.title}".${invoiceNo ? ` Invoice ${invoiceNo}: ${SITE.url}${invoicePath}` : ""}`,
  });
  return { ok: true, id: row.id, invoiceNo, invoicePath };
}

/* ───────────── Admin: submissions ───────────── */
export async function setSubmissionStatusAction(formData: FormData) {
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  const status = z.enum(["new", "reviewing", "accepted", "rejected", "published"]).parse(formData.get("status"));
  const editorNotes = String(formData.get("editorNotes") ?? "").trim() || null;
  const db = await getDb();
  await db.update(schema.submissions).set({ status, editorNotes }).where(eq(schema.submissions.id, id));
  revalidatePath("/admin/submissions");
}

/** Turn an accepted pitch into a draft article the desk can edit, with contributor byline and sponsored flag. */
export async function convertSubmissionAction(formData: FormData) {
  const user = await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  const s = await db.query.submissions.findFirst({ where: eq(schema.submissions.id, id) });
  if (!s) throw new Error("Not found");
  if (s.articleId) redirect(`/admin/articles/${s.articleId}`);
  const kind = s.kind === "press_release" ? "news" : "guide";
  const category = await db.query.categories.findFirst({ where: and(eq(schema.categories.kind, kind), eq(schema.categories.slug, s.category ?? (kind === "news" ? "business" : "business"))) });
  const slug = s.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || `submission-${s.id.slice(0, 8)}`;
  const [article] = await db
    .insert(schema.articles)
    .values({
      kind,
      status: "draft",
      slug,
      title: s.title,
      body: s.body,
      excerpt: s.body.slice(0, 180),
      categoryId: category?.id ?? null,
      isSponsored: s.kind !== "guest",
      contributorName: s.company ? `${s.name}, ${s.company}` : s.name,
      contributorBio: s.website ? `Website: ${s.website}` : null,
      sources: [],
      faqs: [],
      relatedIds: [],
    })
    .returning({ id: schema.articles.id });
  await db.update(schema.submissions).set({ articleId: article.id, status: "accepted", editorNotes: `${s.editorNotes ?? ""}\nConverted by ${user.email}`.trim() }).where(eq(schema.submissions.id, s.id));
  revalidatePath("/admin/submissions");
  redirect(`/admin/articles/${article.id}`);
}
