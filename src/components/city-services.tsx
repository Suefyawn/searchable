import Link from "next/link";
import { DISCOS } from "@/content/discos";

const BILL_GUIDE = (slug: string) => `/guides/utilities/${slug}-bill-check-online-reference-number-customer-id-and-duplicate-bill-2026`;
const GUIDED = new Set(["fesco", "gepco", "mepco", "pesco", "iesco", "lesco", "hesco"]);

/**
 * The bills and offices a resident of this city deals with: its electricity company, its gas company, the
 * provincial vehicle and property portals, and the calculators preset for the province. Built from the
 * reference data, so every city page has something useful on day one, before the directory fills.
 */
export function CityServices({ city, province }: { city: string; province?: string | null }) {
  const disco = DISCOS.find((d) => d.cities.some((c) => c.toLowerCase() === city.toLowerCase()));
  const p = (province ?? "").toLowerCase();
  const south = /sindh|balochistan/.test(p) || /karachi|hyderabad|sukkur|quetta|gwadar/i.test(city);
  const gas = south ? { name: "SSGC", full: "Sui Southern Gas Company" } : { name: "SNGPL", full: "Sui Northern Gas Pipelines" };
  const provKey = /sindh/.test(p) || /karachi|hyderabad|sukkur/i.test(city) ? "sindh" : /islamabad/i.test(city) ? "islamabad" : "punjab";
  const rows: { label: string; value: React.ReactNode }[] = [
    ...(disco
      ? [
          {
            label: "Electricity bill",
            value: (
              <>
                <Link href={`/electricity/${disco.slug}`} className="underline underline-offset-4">{disco.short}</Link>
                {GUIDED.has(disco.slug) ? (
                  <>
                    {" · "}
                    <Link href={BILL_GUIDE(disco.slug)} className="underline underline-offset-4">how to check it online</Link>
                  </>
                ) : null}
                {" · helpline 118"}
              </>
            ),
          },
        ]
      : []),
    {
      label: "Gas bill",
      value: (
        <>
          {gas.full} ({gas.name}) · <Link href="/guides/utilities/sui-gas-bill-check-online-sngpl-and-ssgc-duplicate-bill-by-consumer-number-2026" className="underline underline-offset-4">check it online</Link> · helpline 1199
        </>
      ),
    },
    {
      label: "Vehicle records",
      value: (
        <>
          <Link href="/guides/cars/online-vehicle-verification-in-pakistan-punjab-sindh-islamabad-and-kp-registrati" className="underline underline-offset-4">verify a registration online</Link> · <Link href="/tools/cars/token-tax-calculator" className="underline underline-offset-4">token tax</Link>
        </>
      ),
    },
    {
      label: "Buying property",
      value: (
        <>
          <Link href={`/tools/property/stamp-duty-calculator?province=${provKey}`} className="underline underline-offset-4">stamp duty and registration fee</Link> · <Link href={`/tools/property/property-tax-calculator?province=${provKey}`} className="underline underline-offset-4">advance tax on purchase</Link>
        </>
      ),
    },
    {
      label: "Prices today",
      value: (
        <>
          <Link href="/data/petrol-price" className="underline underline-offset-4">petrol</Link> · <Link href="/data/gold-24k-tola" className="underline underline-offset-4">gold</Link> · <Link href="/data/usd-pkr" className="underline underline-offset-4">dollar</Link>
        </>
      ),
    },
  ];
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-3">Bills and services in {city}</h2>
      <dl className="divide-y divide-[var(--border)] border-y border-line text-[15px]">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr]">
            <dt className="text-3">{r.label}</dt>
            <dd className="text-2">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
