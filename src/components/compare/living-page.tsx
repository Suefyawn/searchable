import Link from "next/link";
import { Suspense } from "react";
import { ToolCard, toolExample } from "@/components/cards";
import { LivingCompare } from "@/components/compare/living-compare";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { readLivingSet, type LivingSlug } from "@/lib/compare-data";
import { formatDate } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { getTool } from "@/tools/registry";

export type LivingPageDef = {
  slug: LivingSlug;
  title: string;
  name: string;
  seoTitle: string;
  description: string;
  intro: string;
  /** What the "price" column is, for the empty state and the JSON-LD. */
  priceWord: string;
  tools: string[];
  related: { href: string; label: string }[];
  faqs: { question: string; answer: string }[];
  howWeCompiled: string;
};

export function livingMetadata(def: LivingPageDef, count: number) {
  return buildMetadata({ title: def.seoTitle, description: def.description, path: `/compare/${def.slug}`, kicker: "Compare", noindex: count < 5 });
}

/** A comparison whose items live in the settings row; the same page renders the empty state honestly. */
export async function LivingPage({ def }: { def: LivingPageDef }) {
  const set = await readLivingSet(def.slug);
  const items = set.items;
  const crumbs = [{ name: "Compare", path: "/compare" }, { name: def.name, path: `/compare/${def.slug}` }];
  const tools = def.tools.map((s) => getTool(s)).filter((t): t is NonNullable<ReturnType<typeof getTool>> => !!t);
  const brands = [...new Set(items.map((i) => i.brand))];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          faqJsonLd(def.faqs),
          items.length
            ? {
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: def.title,
                numberOfItems: items.length,
                itemListElement: items.map((i, n) => ({ "@type": "ListItem", position: n + 1, item: { "@type": "Product", name: `${i.brand} ${i.model}`, brand: { "@type": "Brand", name: i.brand }, offers: { "@type": "Offer", priceCurrency: "PKR", price: i.price, ...(i.url ? { url: i.url } : {}) } } })),
              }
            : null,
        ]}
      />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow="Compare" title={def.title} description={items.length ? `${items.length} ${def.name.toLowerCase()} from ${brands.slice(0, 6).join(", ")}${brands.length > 6 ? " and more" : ""}. ${def.intro}${set.reviewedAt ? ` Prices reviewed ${formatDate(set.reviewedAt)}.` : ""}` : def.intro} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          {items.length ? (
            <section>
              <Suspense fallback={<p className="py-10 text-center text-[15px] text-2">Loading the comparison…</p>}>
                <LivingCompare slug={def.slug} items={items} />
              </Suspense>
            </section>
          ) : (
            <section className="border-y-2 border-[var(--rule)] py-8">
              <p className="font-serif text-2xl">Being compiled</p>
              <p className="mt-2 max-w-[60ch] text-[15px] text-2">The {def.priceWord} for every model is being checked against the {def.slug === "credit-cards" ? "banks' published schedules of charges" : "brands' own price lists"} before it goes up. Check back within the week, or ask for a model by email and we will add it first.</p>
            </section>
          )}
          <section className="max-w-[70ch]">
            <h2 className="font-serif text-2xl">How this comparison is compiled</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-2">{def.howWeCompiled}</p>
            {set.source ? (
              <p className="mt-2 text-[14px] text-3">
                Source: {set.source.url ? <a href={set.source.url} target="_blank" rel="noopener" className="underline underline-offset-4">{set.source.title}</a> : set.source.title}
                {set.source.publisher ? ` (${set.source.publisher})` : ""}
                {set.reviewedAt ? `, reviewed ${formatDate(set.reviewedAt)}` : ""}.
              </p>
            ) : null}
          </section>
          <section className="max-w-[70ch]">
            <h2 className="font-serif text-2xl">Questions</h2>
            <dl className="mt-3 divide-y divide-[var(--border)] border-y border-line">
              {def.faqs.map((f) => (
                <div key={f.question} className="py-3">
                  <dt className="font-medium">{f.question}</dt>
                  <dd className="mt-1 text-[15px] text-2">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <aside className="space-y-4 self-start lg:sticky lg:top-24">
          {tools.map((t) => (
            <ToolCard key={t.slug} tool={t} example={toolExample(t)} />
          ))}
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">Related</p>
            <ul className="mt-2 space-y-1.5">
              {def.related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="underline-offset-4 hover:underline">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
