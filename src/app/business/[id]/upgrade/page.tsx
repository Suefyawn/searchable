import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge, Button, Input } from "@/components/ui";
import { getDb, schema } from "@/db";
import { PRODUCTS } from "@/content/pricing";
import { requireUser } from "@/lib/auth";
import { canEditBusiness } from "@/lib/business-actions";
import { buyPlanAction } from "@/lib/commerce-actions";
import { formatDate, pkr } from "@/lib/format";

export const metadata = { title: "Upgrade your listing", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function UpgradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/business/${id}/upgrade`);
  if (!(await canEditBusiness(user, id))) redirect("/business");
  const db = await getDb();
  const b = await db.query.businesses.findFirst({ where: eq(schema.businesses.id, id), with: { primaryCategory: true, city: true } });
  if (!b) notFound();
  const orders = await db.query.orders.findMany({ where: and(eq(schema.orders.businessId, id)), orderBy: [desc(schema.orders.createdAt)], limit: 10 });
  const plans = PRODUCTS.filter((p) => p.kind === "business_plan" || p.kind === "placement");

  return (
    <div className="container-x max-w-5xl py-10">
      <p className="mb-2 text-sm">
        <Link href="/business" className="text-2 underline-offset-4 hover:underline">← Your businesses</Link>
      </p>
      <h1 className="font-display text-3xl">Upgrade {b.name}</h1>
      <p className="mt-2 text-[15px] text-2">
        Current plan: <Badge tone={b.tier === "free" ? "neutral" : "brand"}>{b.tier}</Badge>
        {b.tierExpiresAt ? <span> · until {formatDate(b.tierExpiresAt)}</span> : null}
        {b.primaryCategory ? <span> · {b.primaryCategory.namePlural ?? b.primaryCategory.name}{b.city ? ` in ${b.city.name}` : ""}</span> : null}
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <form key={p.code} action={buyPlanAction} className={`flex flex-col border-t-2 pt-4 ${p.popular ? "border-[var(--text)]" : "border-line"}`}>
            <input type="hidden" name="businessId" value={b.id} />
            <input type="hidden" name="productCode" value={p.code} />
            <p className="eyebrow">{p.name}{p.popular ? " · Most popular" : ""}</p>
            <p className="mt-2 font-display text-3xl tabular">{pkr(p.pricePkr)}</p>
            <p className="text-sm text-2">per {p.periodDays === 365 ? "year" : "month"}</p>
            <p className="mt-3 text-[15px]">{p.blurb}</p>
            <ul className="mt-3 flex-1 space-y-1.5 text-[14px] text-2">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-3">-</span>{f}</li>
              ))}
            </ul>
            <label className="mt-4 block text-xs text-3">
              WhatsApp number for the invoice (optional)
              <Input name="phone" className="mt-1 h-9 text-sm" placeholder="03xx-xxxxxxx" />
            </label>
            <Button type="submit" size="sm" className="mt-3 w-full" disabled={b.tier === p.tier && !!b.tierExpiresAt && b.tierExpiresAt > new Date()}>
              {b.tier === p.tier && b.tierExpiresAt && b.tierExpiresAt > new Date() ? "Current plan" : `Get ${p.name}, invoice me`}
            </Button>
          </form>
        ))}
      </div>
      <p className="mt-4 text-sm text-2">You receive an invoice with bank, JazzCash and Easypaisa details. Plans activate within one working day of payment. Nothing is charged automatically.</p>

      {orders.length ? (
        <section className="mt-10">
          <h2 className="rule pt-3 font-display text-2xl">Invoices</h2>
          <table className="mt-3 w-full text-[15px]">
            <tbody className="divide-y divide-[var(--border)]">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 pr-4">
                    <Link href={`/orders/${o.invoiceNo}`} className="font-medium underline-offset-4 hover:underline">{o.invoiceNo}</Link>
                    <span className="block text-xs text-3">{o.productName}</span>
                  </td>
                  <td className="py-2 pr-4 tabular">{pkr(o.amountPkr)}</td>
                  <td className="py-2 pr-4"><Badge tone={o.status === "active" || o.status === "paid" ? "success" : o.status === "pending" ? "warning" : "neutral"}>{o.status}</Badge></td>
                  <td className="py-2 text-right text-sm text-3">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
