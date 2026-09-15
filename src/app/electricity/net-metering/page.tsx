import Link from "next/link";
import { ToolCard } from "@/components/cards";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { getDisco } from "@/content/discos";
import { APPROVED_INVERTERS, DISCO_NET_METERING, NET_METERING_REVIEWED_AT, NET_METERING_SOURCES, NOT_ELIGIBLE, RULES } from "@/content/net-metering";
import { formatDate, pkr } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { getTool } from "@/tools/registry";

const FAQS = [
  { question: "Is net metering still available in Pakistan in 2026?", answer: "Not in its old one-for-one form. NEPRA's Prosumer Regulations, notified in February 2026, replaced net metering with net billing: units you import are billed at your normal tariff, units you export are credited at the National Average Energy Purchase Price (about Rs 10–11). Existing agreements keep the higher NAPPP rate (about Rs 25–26) until they expire." },
  { question: "Which inverters are approved for net metering?", answer: "Any grid-tied or hybrid inverter with a UL 1741 / IEC 62116 anti-islanding certificate and IEEE 1547 grid parameters. Huawei, Sungrow, Solis, GoodWe, Growatt, SMA, Fronius and SolarEdge pass without query; Deye, Inverex Aerox/Nitrox, Ziewnic Xtreme, Fox ESS, Sofar, SolaX and Kstar pass when the certificate is attached. Off-grid units never qualify." },
  { question: "Do I need a three-phase connection?", answer: "Yes. The regulations define an applicant as a three-phase 400 V or 11 kV consumer. If your house is on single phase, apply to the DISCO for a three-phase upgrade first (a separate demand notice, usually Rs 25,000–60,000 including the meter)." },
  { question: "How big a system can I install?", answer: "Up to your sanctioned load — a house with a 10 kW sanctioned load cannot net-meter a 15 kW system. Ask the DISCO to raise the sanctioned load first if you need more. The DISCO must also refuse if solar on your transformer has reached 80% of its rating." },
  { question: "How long does net metering take?", answer: "The regulations set working-day limits at every step: 5 days to acknowledge, 15 for technical review, 7 to sign the agreement, 7 to issue the meter estimate, 15 to install after you pay, and 7 for NEPRA’s concurrence — about 8–10 weeks if nothing bounces. In practice LESCO and IESCO take 1–3 months; meter shortages can add more." },
  { question: "What does net metering cost?", answer: "NEPRA’s concurrence fee of Rs 1,000 per kW (Rs 5,000 for a 5 kW system), the DISCO's connection-charge estimate for the bi-directional meter and interconnection (Rs 25,000–65,000 depending on the DISCO), an affidavit on Rs 50 stamp paper, and whatever your installer charges for processing (Rs 10,000–30,000)." },
  { question: "Is solar still worth it under net billing?", answer: "Yes, if you use most of it yourself. Every unit you consume directly saves the full tariff (Rs 37–55). Only the exported surplus earns Rs 10–11, so size the system to your daytime load rather than your roof, and run heavy loads (ACs, pumps, washing) in daylight. The Solar System Calculator models both." },
  { question: "I already have net metering — what changes?", answer: "Your agreement and licence stand until they expire. Exports are credited at the NAPPP (about Rs 25–26) rather than one-for-one, credits are settled monthly rather than rolled over for three months, and if you increase the system's output you lose the old terms. On expiry you renew for five years on the new NAEPP rate." },
];

export const metadata = buildMetadata({
  title: "Net Metering in Pakistan 2026 — Approved Inverters List, New NEPRA Rules, How to Apply (LESCO, IESCO, MEPCO, K-Electric)",
  description: "Net metering became net billing in February 2026. See the new NEPRA export rate, eligibility, step-by-step application with legal timelines, costs, the list of inverters approved for net metering, and how to apply at each DISCO — LESCO, IESCO, MEPCO, GEPCO, FESCO, PESCO, HESCO, SEPCO, QESCO and K-Electric.",
  path: "/electricity/net-metering",
  kicker: "Electricity",
});

export default function NetMeteringHub() {
  const crumbs = [{ name: "Electricity", path: "/electricity" }, { name: "Net metering", path: "/electricity/net-metering" }];
  const solarTool = getTool("solar-payback-calculator")!;
  const billTool = getTool("electricity-bill-calculator")!;
  const totalDays = RULES.timeline.reduce((s, t) => s + t.days, 0);

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(FAQS)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow="NEPRA Prosumer Regulations 2026" title="Net metering in Pakistan: new rules, approved inverters and how to apply" description={`What changed in February 2026, whether solar still pays, the inverters DISCOs accept, and the application steps with the working-day limits the regulations impose. Reviewed ${formatDate(NET_METERING_REVIEWED_AT)}.`} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section className="border-y-2 border-[var(--rule)] py-6">
            <p className="eyebrow">What changed on {formatDate(RULES.notified)}</p>
            <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-3">Export credit — new agreements</dt>
                <dd className="font-serif text-3xl tabular">Rs {RULES.exportRateNew.approx[0]}–{RULES.exportRateNew.approx[1]}<span className="text-base text-3"> /unit</span></dd>
                <dd className="text-sm text-2">{RULES.exportRateNew.label}, set by NEPRA</dd>
              </div>
              <div>
                <dt className="text-sm text-3">Export credit — existing agreements, until expiry</dt>
                <dd className="font-serif text-3xl tabular">Rs {RULES.exportRateExisting.approx[0]}–{RULES.exportRateExisting.approx[1]}<span className="text-base text-3"> /unit</span></dd>
                <dd className="text-sm text-2">{RULES.exportRateExisting.label}</dd>
              </div>
              <div>
                <dt className="text-sm text-3">Import</dt>
                <dd className="text-[17px]">Billed at your normal slab tariff (Rs 37–55 before taxes)</dd>
              </div>
              <div>
                <dt className="text-sm text-3">Settlement</dt>
                <dd className="text-[17px]">{RULES.settlement}</dd>
              </div>
              <div>
                <dt className="text-sm text-3">Agreement term</dt>
                <dd className="text-[17px]">{RULES.termYears} years, renewable (existing 7-year agreements run to expiry)</dd>
              </div>
              <div>
                <dt className="text-sm text-3">System size</dt>
                <dd className="text-[17px]">{RULES.capacityRange}; not above your sanctioned load</dd>
              </div>
            </dl>
            <p className="mt-4 text-[15px] leading-relaxed text-2">
              The 2015 regulations netted exported units against imported units one for one. The Prosumer Regulations (reg. 14) switch to <strong>net billing</strong>: the DISCO buys your export at the national average energy purchase price and sells you import at the retail tariff. Because the retail tariff is four to five times the purchase price, <strong>self-consumption now matters far more than export</strong>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Is solar still worth it?</h2>
            <p className="mt-2 text-[16px] leading-relaxed">
              For a house using 800 units a month, a 6 kW system generating ~750 units in summer: if 60% is used directly you save roughly 450 × Rs 45 = {pkr(450 * 45)} on import plus 300 × Rs 11 = {pkr(300 * 11)} in export credit — about {pkr(450 * 45 + 300 * 11)} a month, a payback of 3–4 years on a Rs 900,000 system. The same system exporting 80% earns far less. Size to your daytime load and shift ACs, pumps and washing into daylight; a battery only makes sense for outages, not for export.
            </p>
            <p className="mt-2 text-[15px]">
              Model your own numbers in the <Link href="/tools/solar/solar-payback-calculator" className="underline underline-offset-4">Solar System Calculator</Link> — its export rate now defaults to the net-billing rate.
            </p>
          </section>

          <section id="eligibility">
            <h2 className="font-serif text-2xl">Eligibility</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-relaxed">
              <li><strong>Connection:</strong> {RULES.eligibility} (reg. 2). Single-phase houses must upgrade first.</li>
              <li><strong>Size:</strong> {RULES.capacityRange}. {RULES.capacityCap} (reg. 3(2)).</li>
              <li><strong>Transformer:</strong> the DISCO must refuse new applications once solar connected to your distribution transformer reaches {RULES.transformerCap * 100}% of its rating (reg. 3(5)). Ask your sub-division for the transformer’s loading before you buy.</li>
              <li><strong>Large systems:</strong> {RULES.loadFlowStudyFromKw} kW and above need a load-flow study by the DISCO or a PEC-registered consultant (reg. 3(3)).</li>
              <li><strong>Installer:</strong> AEDB/PPIB-certified vendor; single-line diagram signed by a PEC-registered engineer.</li>
              <li><strong>Equipment:</strong> grid-tied or hybrid inverter meeting {RULES.standards[0].split(" (")[0]} / {RULES.standards[1].split(" (")[0]}, panels to {RULES.standards[2].split(" (")[0]}, a bi-directional meter supplied by the DISCO (reg. 5, 9).</li>
            </ul>
          </section>

          <section id="apply">
            <h2 className="font-serif text-2xl">How to apply — with the legal time limits</h2>
            <p className="mt-2 text-[15px] text-2">Working days each step is allowed under regulations 3 and 4. Add them up and the process should take about {totalDays} working days ({Math.round(totalDays / 5)} weeks) if nothing is returned.</p>
            <ol className="mt-3 divide-y divide-[var(--border)] border-y border-line">
              <li className="grid gap-x-4 py-3 sm:grid-cols-[2.5rem_1fr_6rem_5rem]">
                <span className="tabular text-3">0</span>
                <span>
                  <strong>Install with a certified vendor</strong> and collect: CNIC, latest bill, ownership proof, AEDB/PPIB certificate, inverter datasheet and anti-islanding certificate, panel datasheets, single-line diagram, site photos. Submit the Schedule II application to your DISCO.
                </span>
                <span className="text-sm text-3">You</span>
                <span className="text-sm text-3">—</span>
              </li>
              {RULES.timeline.map((t, i) => (
                <li key={`${t.reg}-${i}`} className="grid gap-x-4 py-3 sm:grid-cols-[2.5rem_1fr_6rem_5rem]">
                  <span className="tabular text-3">{i + 1}</span>
                  <span>
                    {t.step} <span className="text-xs text-3">reg. {t.reg}</span>
                  </span>
                  <span className="text-sm text-3">{t.who}</span>
                  <span className="text-sm tabular">{t.days} days</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[15px] leading-relaxed text-2">
              Billing under net billing starts once NEPRA accords concurrence. You must commission within {RULES.commissionWithinMonths} months of concurrence or apply afresh (reg. 4(4)), and any later change to the system’s technical parameters needs fresh concurrence (reg. 4(1)). If a DISCO misses a deadline, cite the regulation number in a written complaint to its net-metering cell and to NEPRA’s consumer affairs division.
            </p>
          </section>

          <section id="costs">
            <h2 className="font-serif text-2xl">Costs</h2>
            <table className="mt-3 w-full text-[15px]">
              <tbody className="divide-y divide-[var(--border)] border-y border-line">
                <tr><td className="py-2 pr-3">NEPRA concurrence fee (Schedule IV)</td><td className="py-2 text-right tabular">{pkr(RULES.nepraFeePerKw)} per kW — {pkr(RULES.nepraFeePerKw * 5)} for 5 kW, {pkr(RULES.nepraFeePerKw * 10)} for 10 kW</td></tr>
                <tr><td className="py-2 pr-3">DISCO connection-charge estimate (bi-directional meter, interconnection)</td><td className="py-2 text-right tabular">{pkr(25_000)} – {pkr(65_000)} by DISCO</td></tr>
                <tr><td className="py-2 pr-3">Affidavit (Schedule V)</td><td className="py-2 text-right tabular">Rs 50 stamp paper + oath commissioner</td></tr>
                <tr><td className="py-2 pr-3">Three-phase upgrade, if needed</td><td className="py-2 text-right tabular">{pkr(25_000)} – {pkr(60_000)}</td></tr>
                <tr><td className="py-2 pr-3">Installer processing fee (optional)</td><td className="py-2 text-right tabular">{pkr(10_000)} – {pkr(30_000)}</td></tr>
              </tbody>
            </table>
          </section>

          <section id="approved-inverters">
            <h2 className="font-serif text-2xl">Approved inverters for net metering</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-2">
              No DISCO publishes a standing model list. The net-metering desk checks the datasheet and the UL 1741 / IEC 62116 anti-islanding certificate your installer attaches, and the same NEPRA standard applies at every DISCO and K-Electric. <strong>Routine</strong> means the brand’s paperwork is accepted without query nationwide; <strong>with certificates</strong> means it is accepted when the test certificate is attached — ask the seller for it before buying.
            </p>
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-[640px] text-[15px]">
                <thead className="text-left text-xs uppercase tracking-wider text-3">
                  <tr className="border-b border-[var(--rule)]">
                    <th className="py-2 pr-3 font-medium">Brand</th>
                    <th className="py-2 pr-3 font-medium">Eligible models</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Certificates</th>
                    <th className="py-2 font-medium">Acceptance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {APPROVED_INVERTERS.map((i) => (
                    <tr key={i.brand}>
                      <td className="py-2 pr-3 font-medium">{i.brand}</td>
                      <td className="py-2 pr-3">
                        {i.models}
                        {i.note ? <span className="block text-xs text-3">{i.note}</span> : null}
                      </td>
                      <td className="py-2 pr-3 text-2">{i.type === "both" ? "On-grid & hybrid" : i.type === "hybrid" ? "Hybrid" : "On-grid"}</td>
                      <td className="py-2 pr-3 text-sm text-2">{i.certs}</td>
                      <td className="py-2 text-sm">{i.status === "routine" ? "Routine" : "With certificates"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="mt-5 font-medium">Not eligible at any DISCO</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-2">
              {NOT_ELIGIBLE.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <p className="mt-3 text-[15px]">
              Prices and specs for the eligible models are on the <Link href="/compare/solar-inverters" className="underline underline-offset-4">solar inverter comparison</Link>.
            </p>
          </section>

          <section id="discos">
            <h2 className="font-serif text-2xl">Net metering by DISCO</h2>
            <p className="mt-2 text-[15px] text-2">Where to apply, what the meter estimate usually comes to, and what is specific to each company. The regulations, standards and approved-inverter test are the same everywhere.</p>
            <div className="mt-3 divide-y divide-[var(--border)] border-y border-line">
              {DISCO_NET_METERING.map((n) => {
                const d = getDisco(n.slug);
                if (!d) return null;
                return (
                  <article key={n.slug} id={n.slug} className="py-4">
                    <h3 className="font-serif text-xl">
                      <Link href={`/electricity/${d.slug}`} className="headline-link">{d.short} net metering</Link> <span className="text-base text-3">— {d.region}</span>
                    </h3>
                    <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-[15px] sm:grid-cols-[9rem_1fr]">
                      <dt className="text-3">Apply at</dt>
                      <dd>
                        {n.apply}
                        {n.applyUrl ? (
                          <>
                            {" "}
                            <a href={n.applyUrl} rel="nofollow noopener" target="_blank" className="underline underline-offset-4">{n.applyUrl.replace(/^https?:\/\/(www\.)?/, "")}</a>
                          </>
                        ) : null}
                      </dd>
                      <dt className="text-3">Meter estimate</dt>
                      <dd className="tabular">{pkr(n.meterCost[0])} – {pkr(n.meterCost[1])}</dd>
                      <dt className="text-3">Helpline</dt>
                      <dd>{d.helpline}</dd>
                      {n.notes.length ? (
                        <>
                          <dt className="text-3">Notes</dt>
                          <dd>
                            <ul className="list-disc space-y-1 pl-5 text-2">
                              {n.notes.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          </dd>
                        </>
                      ) : null}
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="existing">
            <h2 className="font-serif text-2xl">Already on net metering?</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-relaxed">
              <li>Your licence and agreement under the 2015 regulations remain valid to expiry (reg. 21(2)).</li>
              <li>From the billing cycle after notification, exports are credited at the NAPPP (≈ Rs {RULES.exportRateExisting.approx[0]}–{RULES.exportRateExisting.approx[1]}) instead of unit-for-unit, and settled monthly.</li>
              <li>Renewals after expiry are for {RULES.termYears} years on the NAEPP rate under the new regulations (reg. 21(3)).</li>
              <li>Adding panels or a larger inverter that raises maximum output is a modification: it needs fresh concurrence and moves you to the new terms. Replacing a failed inverter with the same rating does not.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Frequently asked questions</h2>
            <dl className="mt-4 divide-y divide-[var(--border)] border-y border-line">
              {FAQS.map((f) => (
                <div key={f.question} className="py-4">
                  <dt className="font-medium">{f.question}</dt>
                  <dd className="mt-1.5 text-[15px] leading-relaxed text-2">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h2 className="font-serif text-2xl">Sources</h2>
            <ul className="mt-3 space-y-1.5 text-[15px]">
              {NET_METERING_SOURCES.map((s) => (
                <li key={s.url}>
                  <a href={s.url} rel="nofollow noopener" target="_blank" className="underline underline-offset-4">{s.title}</a> <span className="text-3">— {s.publisher}, {formatDate(s.date)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          <ToolCard tool={solarTool} />
          <ToolCard tool={billTool} />
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">On this page</p>
            <ul className="mt-2 space-y-1.5">
              <li><a href="#eligibility" className="underline-offset-4 hover:underline">Eligibility</a></li>
              <li><a href="#apply" className="underline-offset-4 hover:underline">How to apply (timelines)</a></li>
              <li><a href="#costs" className="underline-offset-4 hover:underline">Costs</a></li>
              <li><a href="#approved-inverters" className="underline-offset-4 hover:underline">Approved inverters</a></li>
              <li><a href="#discos" className="underline-offset-4 hover:underline">By DISCO</a></li>
              <li><a href="#existing" className="underline-offset-4 hover:underline">Existing consumers</a></li>
            </ul>
          </div>
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">Related</p>
            <ul className="mt-2 space-y-1.5">
              <li><Link href="/compare/solar-inverters" className="underline-offset-4 hover:underline">Solar inverter prices compared</Link></li>
              <li><Link href="/data/solar-panel-price" className="underline-offset-4 hover:underline">Solar panel price per watt today</Link></li>
              <li><Link href="/guides/utilities/how-to-apply-for-net-metering-in-pakistan" className="underline-offset-4 hover:underline">Step-by-step guide: applying for net metering</Link></li>
              <li><Link href="/businesses/solar-companies" className="underline-offset-4 hover:underline">AEDB-certified solar installers</Link></li>
              <li><Link href="/electricity" className="underline-offset-4 hover:underline">Electricity bill check &amp; tariff</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
