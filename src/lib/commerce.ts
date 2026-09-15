import { and, desc, eq, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getProduct } from "@/content/pricing";
import { sendEmail } from "./email";
import { pkr } from "./format";
import { SITE } from "./utils";

/** Invoice numbers people can read out on the phone: SP-2026-000123. */
export async function nextInvoiceNo() {
  const db = await getDb();
  const year = new Date().getFullYear();
  const last = await db.query.orders.findFirst({ orderBy: [desc(schema.orders.createdAt)], columns: { invoiceNo: true } });
  const n = last?.invoiceNo.startsWith(`SP-${year}-`) ? parseInt(last.invoiceNo.split("-")[2], 10) + 1 : 1;
  return `SP-${year}-${String(n).padStart(6, "0")}`;
}

export async function createOrder(input: { productCode: string; userId?: string | null; businessId?: string | null; professionalId?: string | null; submissionId?: string | null; payer: { name: string; email: string; phone?: string }; notes?: string; meta?: Record<string, unknown> }) {
  const product = getProduct(input.productCode);
  if (!product) throw new Error("Unknown product");
  const db = await getDb();
  const invoiceNo = await nextInvoiceNo();
  const [order] = await db
    .insert(schema.orders)
    .values({
      invoiceNo,
      kind: product.kind,
      productCode: product.code,
      productName: product.name,
      amountPkr: product.pricePkr,
      userId: input.userId ?? null,
      businessId: input.businessId ?? null,
      professionalId: input.professionalId ?? null,
      submissionId: input.submissionId ?? null,
      payerName: input.payer.name,
      payerEmail: input.payer.email,
      payerPhone: input.payer.phone ?? null,
      notes: input.notes ?? null,
      meta: input.meta ?? {},
    })
    .returning();
  await sendEmail({
    to: input.payer.email,
    subject: `Invoice ${invoiceNo}: ${product.name} on ${SITE.name}`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;line-height:1.6"><h1 style="font-size:20px">Invoice ${invoiceNo}</h1><p><strong>${product.name}</strong>, ${pkr(product.pricePkr)}${product.periodDays ? ` for ${product.periodDays} days` : ""}.</p><p>Pay by bank transfer, JazzCash or Easypaisa and reply with the transaction ID. Details and status: <a href="${SITE.url}/orders/${invoiceNo}">${SITE.url}/orders/${invoiceNo}</a></p></div>`,
    text: `Invoice ${invoiceNo}: ${product.name} ${pkr(product.pricePkr)}. Details: ${SITE.url}/orders/${invoiceNo}`,
  });
  return order;
}

/** Admin marks an order paid → grant what was bought. Idempotent. */
export async function markPaid(orderId: string, opts: { reference?: string; provider?: string } = {}) {
  const db = await getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  if (!order) throw new Error("Order not found");
  if (order.status === "paid" || order.status === "active") return order;
  const product = getProduct(order.productCode);
  const now = new Date();
  const endsAt = product?.periodDays ? new Date(now.getTime() + product.periodDays * 86_400_000) : null;
  await db
    .update(schema.orders)
    .set({ status: product?.periodDays ? "active" : "paid", paidAt: now, startsAt: now, endsAt, paymentReference: opts.reference ?? order.paymentReference, provider: opts.provider ?? order.provider })
    .where(eq(schema.orders.id, orderId));

  if (order.kind === "business_plan" && order.businessId && product?.tier) {
    await db.update(schema.businesses).set({ tier: product.tier, tierExpiresAt: endsAt, isVerified: true, verifiedAt: now, lastVerifiedAt: now }).where(eq(schema.businesses.id, order.businessId));
  }
  if (order.kind === "professional_plan" && order.professionalId) {
    await db.update(schema.professionals).set({ tier: "verified", tierExpiresAt: endsAt, isVerified: true, verifiedAt: now }).where(eq(schema.professionals.id, order.professionalId));
  }
  if (order.kind === "placement" && order.businessId) {
    await db.update(schema.businesses).set({ tier: "sponsored", tierExpiresAt: endsAt }).where(eq(schema.businesses.id, order.businessId));
  }
  if (order.submissionId) {
    await db.update(schema.submissions).set({ orderId: order.id, status: "accepted" }).where(eq(schema.submissions.id, order.submissionId));
  }
  if (order.payerEmail) {
    await sendEmail({
      to: order.payerEmail,
      subject: `Payment received: ${order.invoiceNo}`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;padding:24px;line-height:1.6"><p>Thanks, payment for <strong>${order.productName}</strong> (${order.invoiceNo}) is confirmed.${endsAt ? ` It runs until ${endsAt.toDateString()}.` : ""}</p></div>`,
      text: `Payment for ${order.productName} (${order.invoiceNo}) confirmed.`,
    });
  }
  return { ...order, status: "paid" as const };
}

/** Cron: lapse expired plans back to free. */
export async function expireLapsedPlans() {
  const db = await getDb();
  const now = new Date();
  const lapsed = await db.query.orders.findMany({ where: and(eq(schema.orders.status, "active"), lt(schema.orders.endsAt, now)) });
  for (const o of lapsed) {
    await db.update(schema.orders).set({ status: "expired" }).where(eq(schema.orders.id, o.id));
    if (o.businessId) {
      // Only downgrade if no other active order keeps the tier.
      const other = await db.query.orders.findFirst({ where: and(eq(schema.orders.businessId, o.businessId), eq(schema.orders.status, "active")) });
      if (!other) await db.update(schema.businesses).set({ tier: "free", tierExpiresAt: null }).where(eq(schema.businesses.id, o.businessId));
    }
    if (o.professionalId) {
      const other = await db.query.orders.findFirst({ where: and(eq(schema.orders.professionalId, o.professionalId), eq(schema.orders.status, "active")) });
      if (!other) await db.update(schema.professionals).set({ tier: "free", tierExpiresAt: null, isVerified: false }).where(eq(schema.professionals.id, o.professionalId));
    }
  }
  return lapsed.length;
}
