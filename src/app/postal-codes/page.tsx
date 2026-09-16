import Link from "next/link";
import { PostalSearch } from "@/components/postal/postal-search";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { mainCode, POSTAL_FETCHED, POSTAL_GROUPS, POSTAL_ROWS, POSTAL_SOURCE } from "@/lib/postal-codes";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";

export const revalidate = 86400;
export const metadata = buildMetadata({
  title: "Pakistan Postal Codes: Every Post Office and Zip Code, Searchable",
  description: "Find the postal code (zip code) of any post office in Pakistan: 2,298 delivery post offices under 89 GPOs, from Pakistan Post's own list. Search by town, office or code; Karachi 74000, Lahore 54000, Islamabad 44000.",
  path: "/postal-codes",
  kicker: "Postal codes",
});

const BIG = ["karachi", "lahore", "islamabad", "rawalpindi", "faisalabad", "multan", "peshawar", "quetta", "hyderabad", "gujranwala", "sialkot", "bahawalpur"];

export default function PostalCodesHub() {
  const rows = POSTAL_ROWS.map((r) => ({ o: r.office, c: r.code, a: r.account, s: POSTAL_GROUPS.find((g) => g.account === r.account)?.slug ?? "", p: r.province }));
  const big = BIG.map((s) => POSTAL_GROUPS.find((g) => g.slug === s)).filter((g): g is NonNullable<typeof g> => !!g);
  const byProvince = new Map<string, typeof POSTAL_GROUPS>();
  for (const g of POSTAL_GROUPS) byProvince.set(g.province, [...(byProvince.get(g.province) ?? []), g]);
  const crumbs = [{ name: "Postal codes", path: "/postal-codes" }];
  const faqs = [
    { question: "What is the postal code of Karachi?", answer: "Karachi GPO is 74000; areas under it run from 74000 to 75xxx, each delivery post office with its own five-digit code (Gulshan-e-Iqbal 75300, Clifton 75600, Korangi 74900 and so on). Search your area above." },
    { question: "What is the postal code of Lahore and Islamabad?", answer: "Lahore GPO is 54000 and Islamabad GPO is 44000. Suburban post offices have their own codes (Gulberg 54660, Model Town 54700, F-8 Islamabad 44220)." },
    { question: "Is a Pakistan postal code the same as a zip code?", answer: "Yes. Pakistan uses five-digit postal codes assigned by Pakistan Post; forms abroad that ask for a zip code take the same number." },
    { question: "How is the code built?", answer: "The first two digits mark the region (Karachi 74 to 75, Lahore 53 to 54, Islamabad 44), the rest the delivery post office. Branch offices attached to a delivery office use the next number up, shown here as the attached code." },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow="Pakistan Post" title="Pakistan postal codes" description={`Every delivery post office and its code, ${POSTAL_ROWS.length.toLocaleString("en-PK")} offices under ${POSTAL_GROUPS.length} GPOs. Type a town, an area or a code.`} />
      <PostalSearch rows={rows} />

      <SectionHeader title="Big cities" className="mt-10" />
      <div className="grid grid-cols-2 gap-px border border-line bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-4">
        {big.map((g) => (
          <Link key={g.slug} href={`/postal-codes/${g.slug}`} className="bg-[var(--bg)] px-4 py-3 hover:bg-surface-2">
            <p className="font-semibold">{g.city}</p>
            <p className="text-[13px] text-2">
              GPO {mainCode(g)} · {g.offices.length} offices
            </p>
          </Link>
        ))}
      </div>

      {[...byProvince.entries()].map(([province, gs]) => (
        <section key={province} className="mt-8">
          <h2 className="rule pt-3 font-display text-xl">{province}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[15px] sm:grid-cols-3 lg:grid-cols-4">
            {gs
              .sort((a, b) => a.city.localeCompare(b.city))
              .map((g) => (
                <li key={g.slug} className="flex justify-between gap-2">
                  <Link href={`/postal-codes/${g.slug}`} className="underline-offset-4 hover:underline">
                    {g.city}
                  </Link>
                  <span className="tabular text-3">{mainCode(g)}</span>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <SectionHeader title="Questions" className="mt-10" />
      <div className="divide-y divide-[var(--border)] border-y border-line">
        {faqs.map((f) => (
          <details key={f.question} className="py-3">
            <summary className="cursor-pointer list-none font-semibold">{f.question}</summary>
            <p className="mt-2 text-[15px] text-2">{f.answer}</p>
          </details>
        ))}
      </div>
      <p className="mt-6 text-[13px] text-3">
        Source: {POSTAL_SOURCE.split(",")[0]},{" "}
        <a href="https://www.pakpost.gov.pk/postcodes.php" target="_blank" rel="noopener" className="underline underline-offset-4">
          postcode list
        </a>
        , read {formatDate(POSTAL_FETCHED, { day: "numeric", month: "long", year: "numeric" })}.
      </p>
    </div>
  );
}
