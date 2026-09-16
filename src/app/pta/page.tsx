import Link from "next/link";
import { ToolCard } from "@/components/cards";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { getSeries } from "@/db/queries/data";
import { formatDate, pkr } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { PTA_MOBILE_TAX, REFERENCE_RATES } from "@/tools/data/rates";
import { getTool } from "@/tools/registry";

export const revalidate = 3600;

const FAQS = [
  { question: "How do I check if my phone is PTA approved?", answer: "Dial *#06# to see the IMEI, then SMS the 15-digit IMEI to 8484. The reply says Compliant (approved), Non-compliant (needs registration) or Blocked. You can also check on the DIRBS portal." },
  { question: "How much is PTA tax on an iPhone?", answer: "iPhones fall in the top value slab. Registered on a passport within 60 days of arrival the tax is lower than on a CNIC; the exact amount depends on the phone's declared value and today's dollar rate. Use the PTA Tax Calculator for a live figure." },
  { question: "How long can I use a foreign phone without registering?", answer: "120 days from first use on a Pakistani SIM, once per passport entry. After that the phone is blocked on all local networks until the tax is paid. WiFi keeps working." },
  { question: "Passport or CNIC: which is cheaper?", answer: "Passport, but only within 60 days of your arrival stamp. After 60 days you must register on CNIC at the higher rate." },
  { question: "Where do I pay PTA tax?", answer: "After applying on DIRBS, FBR issues a PSID. Pay it through any bank app, ATM or branch under FBR – Mobile Device Tax. The phone is whitelisted within a day of payment." },
  { question: "Can I register a dual-SIM phone with one payment?", answer: "Yes. Both IMEIs go on one application and one PSID covers the device." },
  { question: "What if I bought a non-PTA phone locally?", answer: "It works for 120 days on a SIM then gets blocked. You can register it on CNIC the same way as an imported phone; ask the seller for the IMEI compliance status before paying." },
];

export const metadata = buildMetadata({
  title: "PTA Tax Check & IMEI Check 2026: PTA Approved Check, DIRBS Registration, Tax List",
  description: "Check PTA tax for any phone, verify PTA approval by IMEI (SMS 8484), register on DIRBS step by step, and see the full PTA tax list for passport and CNIC registration.",
  path: "/pta",
  kicker: "PTA",
});

export default async function PtaHub() {
  const usd = await getSeries("usd-pkr", 1);
  const usdPkr = usd?.points[usd.points.length - 1]?.value ?? REFERENCE_RATES.usdPkr;
  const usdDate = usd?.points[usd.points.length - 1]?.date;
  const crumbs = [{ name: "PTA", path: "/pta" }];
  const tool = getTool("pta-mobile-tax-calculator")!;
  const slabLabel = (max: number | null, i: number, arr: { maxUsd: number | null }[]) => (max === null ? `Above $${arr[i - 1].maxUsd}` : i === 0 ? `Up to $${max}` : `$${arr[i - 1].maxUsd! + 1} – $${max}`);
  const examples = [
    { phone: "Budget Android (~$150)", usd: 150 },
    { phone: "Mid-range (~$300)", usd: 300 },
    { phone: "Galaxy S / Pixel (~$800)", usd: 800 },
    { phone: "iPhone 17 (~$999)", usd: 999 },
    { phone: "iPhone 17 Pro Max (~$1,300)", usd: 1300 },
  ];
  const calc = (valueUsd: number, doc: "passport" | "cnic") => {
    const slabs = PTA_MOBILE_TAX[doc];
    const slab = slabs.find((s) => s.maxUsd === null || valueUsd <= s.maxUsd) ?? slabs[slabs.length - 1];
    return slab.fixedPkr + valueUsd * usdPkr * slab.pctOfValue;
  };

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(FAQS)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow="Pakistan Telecommunication Authority" title="PTA tax check, IMEI check and DIRBS registration" description="Everything about registering a phone in Pakistan on one page: check approval by IMEI, see the tax for your phone, and register on DIRBS." />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section className="border-y-2 border-[var(--rule)] py-6">
            <p className="eyebrow">PTA IMEI check: 10 seconds</p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[17px]">
              <li>
                Dial <strong>*#06#</strong> on the phone to display the IMEI (dual-SIM phones show two).
              </li>
              <li>
                SMS the 15-digit IMEI to <strong>8484</strong>.
              </li>
              <li>
                The reply is <strong>Compliant</strong> (PTA approved), <strong>Non-compliant</strong> (register within 120 days) or <strong>Blocked</strong>.
              </li>
            </ol>
            <p className="mt-3 text-sm text-2">
              Online alternative: the DIRBS portal at{" "}
              <a href="https://dirbs.pta.gov.pk/" target="_blank" rel="noopener" className="underline underline-offset-4">
                dirbs.pta.gov.pk
              </a>{" "}
              → Check Device Status.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl">PTA tax list 2026: by phone value</h2>
            <p className="mt-2 text-[15px] text-2">
              Fixed amount per slab; slabs above $200 also add sales tax on the phone’s rupee value. Rupee figures below use the dollar rate of {usdPkr.toFixed(2)}{usdDate ? ` (${formatDate(usdDate)})` : ""}.
            </p>
            <table className="mt-3 w-full text-[15px]">
              <thead className="text-left text-xs uppercase tracking-wider text-3">
                <tr className="border-b border-[var(--rule)]">
                  <th className="py-2 pr-3 font-medium">Phone value</th>
                  <th className="py-2 pr-3 text-right font-medium">Passport (≤ 60 days)</th>
                  <th className="py-2 text-right font-medium">CNIC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {PTA_MOBILE_TAX.passport.map((s, i, arr) => {
                  const c = PTA_MOBILE_TAX.cnic[i];
                  return (
                    <tr key={i}>
                      <td className="py-2 pr-3">{slabLabel(s.maxUsd, i, arr)}</td>
                      <td className="py-2 pr-3 text-right tabular">
                        {pkr(s.fixedPkr)}
                        {s.pctOfValue ? <span className="text-xs text-3"> + {Math.round(s.pctOfValue * 100)}% of value</span> : null}
                      </td>
                      <td className="py-2 text-right tabular">
                        {pkr(c.fixedPkr)}
                        {c.pctOfValue ? <span className="text-xs text-3"> + {Math.round(c.pctOfValue * 100)}% of value</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-3">
              {PTA_MOBILE_TAX.source.title}. Reviewed {formatDate(PTA_MOBILE_TAX.reviewedAt)}. Indicative, the exact PSID amount is generated by FBR on application.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl">PTA tax on popular phones</h2>
            <table className="mt-3 w-full text-[15px]">
              <thead className="text-left text-xs uppercase tracking-wider text-3">
                <tr className="border-b border-[var(--rule)]">
                  <th className="py-2 pr-3 font-medium">Phone</th>
                  <th className="py-2 pr-3 text-right font-medium">On passport</th>
                  <th className="py-2 text-right font-medium">On CNIC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {examples.map((e) => (
                  <tr key={e.phone}>
                    <td className="py-2 pr-3">{e.phone}</td>
                    <td className="py-2 pr-3 text-right tabular">{pkr(calc(e.usd, "passport"))}</td>
                    <td className="py-2 text-right tabular">{pkr(calc(e.usd, "cnic"))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[15px]">
              Your phone’s exact figure: <Link href="/tools/telecom/pta-mobile-tax-calculator" className="underline underline-offset-4">PTA Tax Calculator</Link>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl">How to register on DIRBS</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[16px]">
              <li>Create an account at dirbs.pta.gov.pk (local Pakistani, overseas Pakistani, or foreigner).</li>
              <li>Choose <strong>Individual COC</strong> (Certificate of Compliance) and enter the IMEI(s).</li>
              <li>Select <strong>passport</strong> (arrival within 60 days, upload the passport page with the entry stamp) or <strong>CNIC</strong>.</li>
              <li>FBR generates a <strong>PSID</strong> with the payable amount, usually within a day.</li>
              <li>Pay through any bank app, ATM or branch under FBR – Mobile Device Tax.</li>
              <li>The device is whitelisted within 24 hours; SMS the IMEI to 8484 again to confirm “Compliant”.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-display text-2xl">Frequently asked questions</h2>
            <dl className="mt-4 divide-y divide-[var(--border)] border-y border-line">
              {FAQS.map((f) => (
                <div key={f.question} className="py-4">
                  <dt className="font-medium">{f.question}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-2">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          <ToolCard tool={tool} />
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">Useful</p>
            <ul className="mt-2 space-y-1.5">
              <li><a href="https://dirbs.pta.gov.pk/" target="_blank" rel="noopener" className="underline-offset-4 hover:underline">DIRBS portal (official)</a></li>
              <li><Link href="/data/usd-pkr" className="underline-offset-4 hover:underline">Dollar rate today (affects the tax)</Link></li>
              <li><Link href="/e/pta" className="underline-offset-4 hover:underline">PTA news and updates</Link></li>
              <li><Link href="/businesses/mobile-shops" className="underline-offset-4 hover:underline">Mobile shops near you</Link></li>
            </ul>
          </div>
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">Helpline</p>
            <p className="mt-1">PTA: <strong>0800-55055</strong> · complaints at complaint.pta.gov.pk</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
