import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { mainCode, POSTAL_GROUPS, postalGroup } from "@/lib/postal-codes";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";

export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props) {
  const { city } = await params;
  const g = postalGroup(city);
  if (!g) return {};
  return buildMetadata({
    title: `${g.city} Postal Code: ${mainCode(g)} (GPO), All ${g.offices.length} Post Offices and Zip Codes`,
    description: `${g.city} postal code is ${mainCode(g)} for the GPO; every delivery post office under ${g.account} with its five-digit code and attached branch code, from Pakistan Post's list. ${g.province}.`,
    path: `/postal-codes/${g.slug}`,
    kicker: "Postal codes",
  });
}

export default async function PostalCityPage({ params }: Props) {
  const { city } = await params;
  const g = postalGroup(city);
  if (!g) notFound();
  const main = mainCode(g);
  const near = POSTAL_GROUPS.filter((x) => x.province === g.province && x.slug !== g.slug).slice(0, 12);
  const crumbs = [
    { name: "Postal codes", path: "/postal-codes" },
    { name: g.city, path: `/postal-codes/${g.slug}` },
  ];
  const faqs = [
    { question: `What is the postal code of ${g.city}?`, answer: `${main} is the code of ${g.account}. Areas served by their own delivery post office have their own code, listed on this page: ${g.offices.slice(0, 4).map((o) => `${o.office} ${o.code}`).join(", ")}${g.offices.length > 4 ? " and more" : ""}.` },
    { question: "Which code do I write on a parcel or form?", answer: "The code of the delivery post office that serves the address. If you are not sure, the GPO code works for the city; the sorting office routes it on. Foreign forms asking for a zip code take the same five digits." },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={`${g.province} · ${g.account}`} title={`${g.city} postal codes`} description={`GPO ${main}. ${g.offices.length} delivery post offices under ${g.account}, each with its code and the code of its attached branch offices.`} />
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="overflow-x-auto">
          <table className="w-full text-[14.5px] tabular">
            <thead>
              <tr className="border-b-2 border-[var(--rule)] text-left text-[12px] uppercase tracking-[0.08em] text-3">
                <th className="py-2 pr-3 font-semibold">Post office</th>
                <th className="py-2 pr-3 font-semibold">Postal code</th>
                <th className="py-2 font-semibold">Attached branches</th>
              </tr>
            </thead>
            <tbody>
              {g.offices.map((o) => (
                <tr key={`${o.code}-${o.office}`} className={`border-b border-line ${/GPO$/i.test(o.office) ? "font-semibold" : ""}`}>
                  <td className="py-2 pr-3">{o.office}</td>
                  <td className="py-2 pr-3 font-semibold">{o.code}</td>
                  <td className="py-2 text-2">{o.branchCode ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <SectionHeader title="Questions" className="mt-10" />
          <div className="divide-y divide-[var(--border)] border-y border-line">
            {faqs.map((f) => (
              <details key={f.question} className="py-3">
                <summary className="cursor-pointer list-none font-semibold">{f.question}</summary>
                <p className="mt-2 text-[15px] text-2">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
        <aside className="space-y-8">
          <div>
            <p className="eyebrow">Also in {g.province}</p>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[15px] lg:grid-cols-1">
              {near.map((x) => (
                <li key={x.slug} className="flex justify-between gap-2">
                  <Link href={`/postal-codes/${x.slug}`} className="underline-offset-4 hover:underline">
                    {x.city}
                  </Link>
                  <span className="tabular text-3">{mainCode(x)}</span>
                </li>
              ))}
            </ul>
            <Link href="/postal-codes" className="mt-2 inline-block text-[14px] font-medium underline-offset-4 hover:underline">
              All cities and search →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
