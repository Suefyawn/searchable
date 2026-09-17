import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PaymentReferenceForm } from "@/components/payment-reference-form";
import { Badge, Breadcrumbs } from "@/components/ui";
import { getDb, schema } from "@/db";
import { getProduct, PAYMENT_DETAILS_SET, PAYMENT_INSTRUCTIONS } from "@/content/pricing";
import { getSessionUser } from "@/lib/auth";
import { canViewOrder } from "@/lib/commerce";
import { formatDate, pkr } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice", robots: { index: false, follow: false } };

const TONE: Record<string, "neutral" | "warning" | "success" | "danger"> = { pending: "warning", paid: "success", active: "success", expired: "neutral", cancelled: "danger", refunded: "neutral" };

/** Invoice + payment instructions. Reachable through the signed link in the email (`?k=`), by the account that placed the order, or by an admin. */
export default async function InvoicePage({ params, searchParams }: { params: Promise<{ invoiceNo: string }>; searchParams: Promise<{ k?: string }> }) {
  const [{ invoiceNo }, { k }] = await Promise.all([params, searchParams]);
  const db = await getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.invoiceNo, invoiceNo) });
  if (!order || !canViewOrder(order, await getSessionUser(), k)) notFound();
  const product = getProduct(order.productCode);
  const business = order.businessId ? await db.query.businesses.findFirst({ where: eq(schema.businesses.id, order.businessId), columns: { name: true, slug: true } }) : null;

  return (
    <div className="container-x max-w-3xl py-8 sm:py-12">
      <Breadcrumbs items={[{ name: "Advertise", path: "/advertise" }, { name: invoiceNo, path: `/orders/${invoiceNo}` }]} className="mb-4" />
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-[var(--rule)] pb-4">
        <div>
          <p className="eyebrow">Invoice</p>
          <h1 className="font-display text-3xl">{order.invoiceNo}</h1>
        </div>
        <Badge tone={TONE[order.status] ?? "neutral"}>{order.status}</Badge>
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-3 text-[15px] sm:grid-cols-[10rem_1fr]">
        <dt className="text-3">Item</dt>
        <dd>
          <span className="font-medium">{order.productName}</span>
          {product?.periodDays ? <span className="text-2"> · {product.periodDays === 365 ? "12 months" : `${product.periodDays} days`}</span> : null}
          {order.notes ? <span className="block text-2">{order.notes}</span> : null}
          {business ? (
            <span className="block text-2">
              For <Link href={`/b/${business.slug}`} className="underline underline-offset-4">{business.name}</Link>
            </span>
          ) : null}
        </dd>
        <dt className="text-3">Billed to</dt>
        <dd>
          {order.payerName}
          <span className="block text-2">{order.payerEmail}</span>
        </dd>
        <dt className="text-3">Issued</dt>
        <dd>{formatDate(order.createdAt)}</dd>
        {order.paidAt ? (
          <>
            <dt className="text-3">Paid</dt>
            <dd>{formatDate(order.paidAt)}{order.endsAt ? ` · active until ${formatDate(order.endsAt)}` : ""}</dd>
          </>
        ) : null}
        <dt className="text-3">Amount</dt>
        <dd className="font-display text-3xl tabular">{pkr(order.amountPkr)}</dd>
      </dl>

      {order.status === "pending" ? (
        <section className="mt-8 border-t border-line pt-6">
          <h2 className="font-display text-2xl">How to pay</h2>
          {PAYMENT_DETAILS_SET ? (
            <>
              <dl className="mt-3 grid gap-x-8 gap-y-2 text-[15px] sm:grid-cols-[10rem_1fr]">
                {PAYMENT_INSTRUCTIONS.accountNumber ? (
                  <>
                    <dt className="text-3">Bank transfer</dt>
                    <dd>
                      {PAYMENT_INSTRUCTIONS.bankName} · {PAYMENT_INSTRUCTIONS.accountTitle}
                      <span className="block tabular">
                        A/C {PAYMENT_INSTRUCTIONS.accountNumber}
                        {PAYMENT_INSTRUCTIONS.iban ? ` · IBAN ${PAYMENT_INSTRUCTIONS.iban}` : ""}
                      </span>
                    </dd>
                  </>
                ) : null}
                {PAYMENT_INSTRUCTIONS.jazzcash ? (
                  <>
                    <dt className="text-3">JazzCash</dt>
                    <dd className="tabular">{PAYMENT_INSTRUCTIONS.jazzcash}</dd>
                  </>
                ) : null}
                {PAYMENT_INSTRUCTIONS.easypaisa ? (
                  <>
                    <dt className="text-3">Easypaisa</dt>
                    <dd className="tabular">{PAYMENT_INSTRUCTIONS.easypaisa}</dd>
                  </>
                ) : null}
                <dt className="text-3">Reference</dt>
                <dd>Put <strong>{order.invoiceNo}</strong> in the transfer note.</dd>
              </dl>
              <p className="mt-3 text-[15px] text-2">{PAYMENT_INSTRUCTIONS.note}</p>
            </>
          ) : (
            <p className="mt-3 max-w-[60ch] text-[15px] text-2">
              We will email the bank and wallet details for invoice <strong>{order.invoiceNo}</strong> from billing@searchable.pk within one working day. Nothing is due until then, and the plan activates the day payment lands.
            </p>
          )}
          <div className="mt-6">
            <PaymentReferenceForm invoiceNo={order.invoiceNo} k={k} existing={order.paymentReference} />
          </div>
        </section>
      ) : null}

      {order.status === "active" || order.status === "paid" ? (
        <p className="mt-8 border-t border-line pt-6 text-[15px]">
          Thank you. {order.kind === "business_plan" ? "Your plan is live, manage it from your " : order.kind === "sponsored_post" ? "Our desk is editing your article and will send it for approval before publication. " : ""}
          {order.kind === "business_plan" ? <Link href="/business" className="underline underline-offset-4">business dashboard</Link> : null}
        </p>
      ) : null}
    </div>
  );
}
