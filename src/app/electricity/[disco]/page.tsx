import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolCard } from "@/components/cards";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { DISCOS, getDisco } from "@/content/discos";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { ELECTRICITY } from "@/tools/data/rates";
import { getTool } from "@/tools/registry";

export const revalidate = 86400;
type Props = { params: Promise<{ disco: string }> };

export function generateStaticParams() {
  return DISCOS.map((d) => ({ disco: d.slug }));
}

function faqsFor(d: ReturnType<typeof getDisco> & object) {
  return [
    { question: `How do I check my ${d.short} bill online?`, answer: `Open the official portal at ${d.billUrlLabel}, enter the 14-digit reference number printed on any previous bill, and your current bill appears with the due date and amount. No account or login is needed.` },
    { question: `Where is the reference number on a ${d.short} bill?`, answer: "It is the 14-digit number at the top-left of the bill, usually labelled Reference No. It stays the same every month for your connection." },
    { question: `What is the ${d.short} helpline?`, answer: `Dial ${d.helpline} for outages, complaints and billing queries. Complaints can also be lodged through the company's website and the PITC complaint portal.` },
    { question: `Why is my ${d.short} bill so high this month?`, answer: "Above 200 units the entire consumption is billed at the higher slab rate; fuel price adjustment and quarterly adjustments are added on top. Use the bill calculator below to see exactly how your units turn into rupees." },
    { question: `Is the ${d.short} per-unit price different from other companies?`, answer: "No — NEPRA sets a uniform residential tariff for all distribution companies. Only K-Electric's tariff is determined separately, and it tracks the same schedule." },
  ];
}

export async function generateMetadata({ params }: Props) {
  const { disco } = await params;
  const d = getDisco(disco);
  if (!d) return {};
  return buildMetadata({
    title: `${d.short} Bill Check Online — Check ${d.short} Bill by Reference Number, Calculate & Pay`,
    description: `Check your ${d.short} electricity bill online in seconds using the reference number, see the current per-unit price, calculate your bill from units, and find the ${d.short} helpline. Covers ${d.cities.slice(0, 4).join(", ")}.`,
    path: `/electricity/${d.slug}`,
    kicker: "Electricity",
  });
}

export default async function DiscoPage({ params }: Props) {
  const { disco } = await params;
  const d = getDisco(disco);
  if (!d) notFound();
  const tool = getTool("electricity-bill-calculator")!;
  const solar = getTool("solar-payback-calculator")!;
  const faqs = faqsFor(d);
  const crumbs = [{ name: "Electricity", path: "/electricity" }, { name: d.short, path: `/electricity/${d.slug}` }];
  const others = DISCOS.filter((x) => x.slug !== d.slug);
  const netMeteringHref = `/electricity/net-metering#${d.slug}`;

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={d.name} title={`${d.short} bill check online`} description={`Check your ${d.short} bill by reference number, see the per-unit price, and calculate a bill from units. Serves ${d.region}: ${d.cities.join(", ")}.`} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section className="border-y-2 border-[var(--rule)] py-6">
            <p className="eyebrow">Check your bill</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[17px]">
              <li>
                Open the official portal:{" "}
                <a href={d.billUrl} target="_blank" rel="noopener" className="font-medium underline underline-offset-4">
                  {d.billUrlLabel}
                </a>
              </li>
              <li>Enter the 14-digit reference number from any previous {d.short} bill.</li>
              <li>Your current bill, due date and payable amount appear. Download or print the copy for payment.</li>
            </ol>
            <p className="mt-3 text-sm text-2">
              Helpline <strong>{d.helpline}</strong>. {d.notes ?? ""}
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl">{d.short} per-unit price (residential, {formatDate(ELECTRICITY.reviewedAt, { month: "long", year: "numeric" })})</h2>
            <p className="mt-2 text-[15px] text-2">NEPRA’s uniform tariff applies to {d.short}. Energy charge only — GST ({ELECTRICITY.gstRate * 100}%), FC surcharge (Rs {ELECTRICITY.fcSurchargePerUnit}/unit), electricity duty and fuel price adjustment are added on the bill.</p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <table className="w-full text-[15px]">
                <caption className="mb-1 text-left text-xs font-bold uppercase tracking-[0.12em] text-3">Unprotected consumers</caption>
                <tbody className="divide-y divide-[var(--border)] border-y border-line">
                  {ELECTRICITY.unprotected.map((s) => (
                    <tr key={s.from}>
                      <td className="py-1.5">{s.to ? `${s.from}–${s.to} units` : `${s.from}+ units`}</td>
                      <td className="py-1.5 text-right tabular">Rs {s.rate.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full text-[15px]">
                <caption className="mb-1 text-left text-xs font-bold uppercase tracking-[0.12em] text-3">Protected (≤ 200 units for 6 months)</caption>
                <tbody className="divide-y divide-[var(--border)] border-y border-line">
                  {ELECTRICITY.protected.map((s) => (
                    <tr key={s.from}>
                      <td className="py-1.5">{`${s.from}–${s.to} units`}</td>
                      <td className="py-1.5 text-right tabular">Rs {s.rate.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-3">Source: {ELECTRICITY.source.title}. Last reviewed {formatDate(ELECTRICITY.reviewedAt)}.</p>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Frequently asked questions</h2>
            <dl className="mt-4 divide-y divide-[var(--border)] border-y border-line">
              {faqs.map((f) => (
                <div key={f.question} className="py-4">
                  <dt className="font-medium">{f.question}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-2">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Other electricity companies</h2>
            <p className="mt-3 text-[15px] leading-loose">
              {others.map((o, i) => (
                <span key={o.slug}>
                  <Link href={`/electricity/${o.slug}`} className="underline underline-offset-4">
                    {o.short} bill check
                  </Link>
                  {i < others.length - 1 ? <span className="text-ink-300"> · </span> : null}
                </span>
              ))}
            </p>
          </section>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          <ToolCard tool={tool} />
          <ToolCard tool={solar} />
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">Read</p>
            <ul className="mt-2 space-y-1.5">
              <li>
                <Link href="/news/pakistan/electricity-bill-slabs-why-crossing-200-units-costs-so-much" className="underline-offset-4 hover:underline">
                  Why crossing 200 units makes your bill jump
                </Link>
              </li>
              <li>
                <Link href={netMeteringHref} className="underline-offset-4 hover:underline">
                  {d.short} net metering: 2026 rules, approved inverters, how to apply
                </Link>
              </li>
              <li>
                <Link href="/businesses/solar-companies" className="underline-offset-4 hover:underline">
                  Solar installers near you
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
