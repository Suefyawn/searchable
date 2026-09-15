import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { Badge, Button, Input } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { cancelOrderAction, markPaidAction } from "@/lib/commerce-actions";
import { formatDate, pkr } from "@/lib/format";

export const dynamic = "force-dynamic";

const TONE = { pending: "warning", paid: "success", active: "success", expired: "neutral", cancelled: "danger", refunded: "neutral" } as const;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("editor");
  const { status } = await searchParams;
  const db = await getDb();
  const [orders, totals] = await Promise.all([
    db.query.orders.findMany({ where: status ? eq(schema.orders.status, status as "pending") : undefined, orderBy: [desc(schema.orders.createdAt)], limit: 200, with: { business: { columns: { name: true, slug: true } } } }),
    db
      .select({ status: schema.orders.status, n: sql<number>`count(*)::int`, sum: sql<number>`coalesce(sum(${schema.orders.amountPkr}),0)::int`, month: sql<number>`coalesce(sum(case when ${schema.orders.paidAt} > now() - interval '30 days' then ${schema.orders.amountPkr} else 0 end),0)::int` })
      .from(schema.orders)
      .groupBy(schema.orders.status),
  ]);
  const by = Object.fromEntries(totals.map((t) => [t.status, t]));
  const paid = (by.paid?.sum ?? 0) + (by.active?.sum ?? 0) + (by.expired?.sum ?? 0);
  const last30 = (by.paid?.month ?? 0) + (by.active?.month ?? 0) + (by.expired?.month ?? 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Orders & invoices</h1>
      <p className="mb-6 text-sm text-2">
        Revenue to date <strong className="tabular">{pkr(paid)}</strong> · last 30 days <strong className="tabular">{pkr(last30)}</strong> · awaiting payment <strong className="tabular">{pkr(by.pending?.sum ?? 0)}</strong> ({by.pending?.n ?? 0}).
      </p>
      <nav className="mb-4 flex gap-1 border-y border-line py-1.5 text-sm">
        {["", "pending", "active", "paid", "expired", "cancelled"].map((s) => (
          <Link key={s} href={s ? `/admin/orders?status=${s}` : "/admin/orders"} className={`px-2.5 py-1.5 ${(status ?? "") === s ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "text-2 hover:bg-surface-2"}`}>
            {s || "All"}
          </Link>
        ))}
      </nav>
      <table className="w-full text-[15px]">
        <thead className="text-left text-xs uppercase tracking-wider text-3">
          <tr className="border-b border-[var(--rule)]">
            <th className="py-2 pr-4 font-medium">Invoice</th>
            <th className="py-2 pr-4 font-medium">Item</th>
            <th className="py-2 pr-4 font-medium">Payer</th>
            <th className="py-2 pr-4 text-right font-medium">Amount</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {orders.map((o) => (
            <tr key={o.id} className="align-top">
              <td className="py-2.5 pr-4">
                <Link href={`/orders/${o.invoiceNo}`} className="font-mono text-sm underline-offset-4 hover:underline">{o.invoiceNo}</Link>
                <span className="block text-xs text-3">{formatDate(o.createdAt)}</span>
              </td>
              <td className="py-2.5 pr-4">
                {o.productName}
                {o.business ? (
                  <span className="block text-xs text-2">
                    <Link href={`/b/${o.business.slug}`} className="underline-offset-4 hover:underline">{o.business.name}</Link>
                  </span>
                ) : o.notes ? (
                  <span className="block text-xs text-2">{o.notes}</span>
                ) : null}
                {o.endsAt ? <span className="block text-xs text-3">until {formatDate(o.endsAt)}</span> : null}
              </td>
              <td className="py-2.5 pr-4 text-sm">
                {o.payerName}
                <span className="block text-xs text-3">{o.payerEmail}{o.payerPhone ? ` · ${o.payerPhone}` : ""}</span>
                {o.paymentReference ? <span className="block text-xs">Ref: <span className="font-mono">{o.paymentReference}</span> ({o.provider})</span> : null}
              </td>
              <td className="py-2.5 pr-4 text-right tabular">{pkr(o.amountPkr)}</td>
              <td className="py-2.5 pr-4"><Badge tone={TONE[o.status]}>{o.status}</Badge></td>
              <td className="py-2.5 text-right">
                {o.status === "pending" ? (
                  <div className="flex flex-col items-end gap-1.5">
                    <form action={markPaidAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={o.id} />
                      <Input name="reference" defaultValue={o.paymentReference ?? ""} placeholder="Txn ref" className="h-8 w-32 text-xs" />
                      <Button size="sm" type="submit">Mark paid</Button>
                    </form>
                    <form action={cancelOrderAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <Button size="sm" variant="ghost" type="submit">Cancel</Button>
                    </form>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
          {orders.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-2">No orders{status ? ` with status ${status}` : " yet"}.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
