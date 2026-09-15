import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge, Button, Input } from "@/components/ui";
import { getDb, schema } from "@/db";
import { PRODUCTS } from "@/content/pricing";
import { getProfession } from "@/content/professions";
import { requireUser } from "@/lib/auth";
import { buyProfessionalPlanAction } from "@/lib/commerce-actions";
import { formatDate, pkr } from "@/lib/format";

export const metadata = { title: "Get verified", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfessionalUpgradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/professional/${id}/upgrade`);
  const db = await getDb();
  const p = await db.query.professionals.findFirst({ where: eq(schema.professionals.id, id), with: { city: true } });
  if (!p) notFound();
  if (p.ownerUserId !== user.id) redirect("/professional");
  const orders = await db.query.orders.findMany({ where: eq(schema.orders.professionalId, id), orderBy: [desc(schema.orders.createdAt)], limit: 10 });
  const plan = PRODUCTS.find((x) => x.kind === "professional_plan")!;
  const prof = getProfession(p.professionSlug);
  const current = p.tier === "verified" && p.tierExpiresAt && p.tierExpiresAt > new Date();

  return (
    <div className="container-x max-w-4xl py-10">
      <p className="mb-2 text-sm">
        <Link href="/professional" className="text-2 underline-offset-4 hover:underline">
          ← Your profiles
        </Link>
      </p>
      <h1 className="font-serif text-3xl">Verified badge for {p.name}</h1>
      <p className="mt-2 text-[15px] text-2">
        Current: <Badge tone={p.isVerified ? "success" : "neutral"}>{p.isVerified ? "verified" : "not verified"}</Badge>
        {p.tierExpiresAt ? <span> · until {formatDate(p.tierExpiresAt)}</span> : null}
        {prof ? (
          <span>
            {" "}
            · {prof.name}
            {p.city ? ` in ${p.city.name}` : ""}
          </span>
        ) : null}
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="text-[15px]">
          <h2 className="eyebrow mb-3">What we check</h2>
          <ol className="list-decimal space-y-2 pl-5 text-2">
            <li>
              Your {prof?.licence ? `${prof.licence.body} registration number (${prof.licence.label.toLowerCase()})` : "professional registration, qualification or portfolio"}, against the public register where one exists.
            </li>
            <li>Identity: a CNIC or passport matched to the name on the profile. Seen by one editor, never stored.</li>
            <li>That the phone number on the profile reaches you.</li>
          </ol>
          <h2 className="eyebrow mb-3 mt-8">What you get</h2>
          <ul className="space-y-1.5 text-2">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-3">-</span>
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[14px] text-3">After paying, email your registration certificate and identity document to billing@searchable.pk quoting the invoice number, or we will contact you. The badge appears once both checks pass, usually within two working days.</p>
        </div>
        <form action={buyProfessionalPlanAction} className="self-start border-t-2 border-[var(--text)] pt-4">
          <input type="hidden" name="professionalId" value={p.id} />
          <input type="hidden" name="productCode" value={plan.code} />
          <p className="eyebrow">{plan.name}</p>
          <p className="mt-2 font-serif text-3xl tabular">{pkr(plan.pricePkr)}</p>
          <p className="text-sm text-2">per year</p>
          <p className="mt-3 text-[15px]">{plan.blurb}</p>
          <label className="mt-4 block text-xs text-3">
            WhatsApp number for the invoice (optional)
            <Input name="phone" className="mt-1 h-9 text-sm" placeholder="03xx-xxxxxxx" />
          </label>
          <Button type="submit" size="sm" className="mt-3 w-full" disabled={!!current}>
            {current ? "Active" : "Get verified, invoice me"}
          </Button>
          <p className="mt-3 text-[12.5px] text-3">You receive an invoice with bank, JazzCash and Easypaisa details. Nothing is charged automatically.</p>
        </form>
      </div>

      {orders.length ? (
        <section className="mt-10">
          <h2 className="rule pt-3 font-serif text-2xl">Invoices</h2>
          <table className="mt-3 w-full text-[15px]">
            <tbody className="divide-y divide-[var(--border)]">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="py-2 pr-4">
                    <Link href={`/orders/${o.invoiceNo}`} className="font-medium underline-offset-4 hover:underline">
                      {o.invoiceNo}
                    </Link>
                    <span className="block text-xs text-3">{o.productName}</span>
                  </td>
                  <td className="py-2 pr-4 tabular">{pkr(o.amountPkr)}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={o.status === "active" || o.status === "paid" ? "success" : o.status === "pending" ? "warning" : "neutral"}>{o.status}</Badge>
                  </td>
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
