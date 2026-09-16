import Link from "next/link";
import { ToolCard } from "@/components/cards";
import { DiscoFinder } from "@/components/disco-finder";
import { SectionHeader } from "@/components/ui";
import { DISCOS } from "@/content/discos";
import { buildMetadata } from "@/lib/seo";
import { getTool } from "@/tools/registry";

export const revalidate = 86400;
export const metadata = buildMetadata({
  title: "Electricity Bill Check Online: LESCO, IESCO, MEPCO, K-Electric & All DISCOs",
  description: "Check any electricity bill online in Pakistan by reference number, see the current per-unit price, and calculate your bill from units. Official portals for LESCO, IESCO, MEPCO, GEPCO, FESCO, PESCO, HESCO, SEPCO, QESCO, TESCO and K-Electric.",
  path: "/electricity",
  kicker: "Electricity",
});

export default function ElectricityHub() {
  return (
    <div className="container-x py-8 sm:py-12">
      <SectionHeader as="h1" eyebrow="Electricity" title="Electricity bill check online" description="Pick your distribution company to check a bill by reference number, see the per-unit tariff and use the bill calculator." />
      <div className="mb-8">
        <DiscoFinder discos={DISCOS.map(({ slug, short, name, region, cities, billUrl, billUrlLabel }) => ({ slug, short, name, region, cities, billUrl, billUrlLabel }))} />
      </div>
      <div className="grid gap-x-8 gap-y-2 border-t border-line sm:grid-cols-2">
        {DISCOS.map((d) => (
          <Link key={d.slug} href={`/electricity/${d.slug}`} className="border-b border-line py-4 hover:bg-surface-2">
            <p className="font-display text-xl">{d.short} bill check</p>
            <p className="mt-0.5 text-sm text-2">
              {d.name} · {d.cities.slice(0, 3).join(", ")}
              {d.cities.length > 3 ? ` +${d.cities.length - 3}` : ""}
            </p>
          </Link>
        ))}
      </div>
      <div className="mt-8 border-y-2 border-[var(--rule)] py-4">
        <p className="eyebrow">Solar</p>
        <p className="mt-1 font-display text-xl">
          <Link href="/electricity/net-metering" className="headline-link">Net metering in 2026: new NEPRA rules, approved inverters and how to apply at your DISCO</Link>
        </p>
        <p className="mt-1 text-sm text-2">Net billing replaced net metering in February 2026: export credit, eligibility, time limits and costs explained.</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ToolCard tool={getTool("electricity-bill-calculator")!} />
        <ToolCard tool={getTool("ac-running-cost-calculator")!} />
        <ToolCard tool={getTool("solar-payback-calculator")!} />
      </div>
    </div>
  );
}
