import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, EmptyRow, FilterTabs, Stat, Status, Table, TBody, Td, THead } from "@/components/admin";
import { Button, Input } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { cancelOrderAction, markPaidAction } from "@/lib/commerce-actions";
import { formatDate, pkr } from "@/lib/format";

export const dynamic = "force-dynamic";
const STATUSES = ["", "pending", "active", "paid", "expired", "cancelled"] as const;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("editor");
  const { status = "" } = await searchParams;
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
  const count = (s: string) => (s ? by[s]?.n ?? 0 : totals.reduce((a, t) => a + t.n, 0));

  return (
    <AdminPage title="Orders and invoices" description="Bank transfer, JazzCash and Easypaisa land here as pending invoices. Check the reference against the bank statement, then mark paid: the plan or sponsored slot activates on the spot.">
      <div className="mb-8 grid gap-x-6 gap-y-6 sm:grid-cols-3">
        <Stat label="Revenue to date" value={pkr(paid)} />
        <Stat label="Last 30 days" value={pkr(last30)} />
        <Stat label="Awaiting payment" value={pkr(by.pending?.sum ?? 0)} hint={`${by.pending?.n ?? 0} invoice${(by.pending?.n ?? 0) === 1 ? "" : "s"}`} href="/admin/orders?status=pending" />
      </div>
      <FilterTabs items={STATUSES.map((s) => ({ href: s ? `/admin/orders?status=${s}` : "/admin/orders", label: s || "all", count: count(s), active: status === s }))} className="mb-4" />
      <Table>
        <THead cols={["Invoice", "Item", "Payer", { label: "Amount", align: "right" }, "Status", { label: "", className: "w-56" }]} />
        <TBody>
          {orders.map((o) => (
            <tr key={o.id}>
              <Td>
                <Link href={`/orders/${o.invoiceNo}`} className="font-mono text-[13px] underline-offset-4 hover:underline">
                  {o.invoiceNo}
                </Link>
                <span className="block text-[12.5px] text-3">{formatDate(o.createdAt)}</span>
              </Td>
              <Td>
                {o.productName}
                {o.business ? (
                  <span className="block text-[12.5px] text-2">
                    <Link href={`/b/${o.business.slug}`} className="underline-offset-4 hover:underline">
                      {o.business.name}
                    </Link>
                  </span>
                ) : o.notes ? (
                  <span className="block text-[12.5px] text-2">{o.notes}</span>
                ) : null}
                {o.endsAt ? <span className="block text-[12.5px] text-3">until {formatDate(o.endsAt)}</span> : null}
              </Td>
              <Td className="text-[13.5px]">
                {o.payerName}
                <span className="block text-[12.5px] text-3">
                  {o.payerEmail}
                  {o.payerPhone ? ` · ${o.payerPhone}` : ""}
                </span>
                {o.paymentReference ? (
                  <span className="block text-[12.5px]">
                    Ref <span className="font-mono">{o.paymentReference}</span> ({o.provider})
                  </span>
                ) : null}
              </Td>
              <Td align="right">{pkr(o.amountPkr)}</Td>
              <Td>
                <Status value={o.status} />
              </Td>
              <Td align="right">
                {o.status === "pending" ? (
                  <div className="flex flex-col items-end gap-1.5">
                    <form action={markPaidAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={o.id} />
                      <Input name="reference" defaultValue={o.paymentReference ?? ""} placeholder="Txn ref" className="h-8 w-32 text-xs" />
                      <Button size="sm" type="submit">
                        Mark paid
                      </Button>
                    </form>
                    <form action={cancelOrderAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <Button size="sm" variant="ghost" type="submit">
                        Cancel
                      </Button>
                    </form>
                  </div>
                ) : null}
              </Td>
            </tr>
          ))}
          {!orders.length ? <EmptyRow colSpan={6}>No orders{status ? ` with status ${status}` : " yet"}.</EmptyRow> : null}
        </TBody>
      </Table>
    </AdminPage>
  );
}
