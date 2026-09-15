import Link from "next/link";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { FREE_FEATURES, PRODUCTS } from "@/content/pricing";
import { pkr } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";

const FAQS = [
  { question: "How do I pay?", answer: "Bank transfer, JazzCash or Easypaisa to the details on your invoice. Send the transaction ID and your plan activates within one working day. Card payments are coming with our gateway integration." },
  { question: "Do paid listings affect reviews or rankings in editorial content?", answer: "No. Paid tiers change placement in directory listings and are labelled. Reviews, ratings, calculator results and news are never for sale, and sponsored articles are marked Sponsored." },
  { question: "What does a dofollow link mean for my site?", answer: "Free listings link to your website with rel=nofollow. Verified and higher tiers get a standard followed link from your profile page; sponsored articles link with rel=sponsored as Google requires. We do not sell links inside editorial articles." },
  { question: "Can I cancel?", answer: "Monthly plans simply lapse if you do not renew; annual Verified is non-refundable after activation. Sponsored articles are refunded in full if we decline the topic before editing starts." },
  { question: "Is there a discount for multiple locations?", answer: "Yes — email ads@searchable.pk with the list of branches and we quote a bundle." },
];

export const metadata = buildMetadata({
  title: "Advertise on Searchable — Verified & Premium Listings, Sponsored Articles, Category Sponsorship (Pricing)",
  description: "Reach Pakistanis at the moment they are searching: verified and premium business listings from Rs 4,900, sponsored articles, press releases and category sponsorship. Transparent pricing, labelled placements.",
  path: "/advertise",
  kicker: "Advertise",
});

export default function AdvertisePage() {
  const plans = PRODUCTS.filter((p) => p.kind === "business_plan");
  const content = PRODUCTS.filter((p) => p.kind === "sponsored_post");
  const placements = PRODUCTS.filter((p) => p.kind === "placement");
  const crumbs = [{ name: "Advertise", path: "/advertise" }];

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(FAQS)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow="Advertise" title="Reach people at the moment they are looking" description="Searchable's readers are calculating a tax, comparing a loan, choosing a solar installer or finding a dentist. Every placement is labelled; editorial content and calculator results are never for sale." />

      <section>
        <h2 className="rule pt-3 font-serif text-2xl">Business listings</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="border-t-2 border-line pt-4">
            <p className="eyebrow">Free</p>
            <p className="mt-2 font-serif text-3xl">Rs 0</p>
            <p className="mt-1 text-sm text-2">Always</p>
            <ul className="mt-4 space-y-1.5 text-[15px]">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex gap-2"><span className="text-3">—</span>{f}</li>
              ))}
            </ul>
            <Link href="/add-business" className="mt-5 inline-block text-sm font-medium underline underline-offset-4">Add your business</Link>
          </div>
          {plans.map((p) => (
            <div key={p.code} className={`border-t-2 pt-4 ${p.popular ? "border-[var(--text)]" : "border-line"}`}>
              <p className="eyebrow">{p.name}{p.popular ? " · Most popular" : ""}</p>
              <p className="mt-2 font-serif text-3xl tabular">{pkr(p.pricePkr)}</p>
              <p className="mt-1 text-sm text-2">per {p.periodDays === 365 ? "year" : "month"}</p>
              <p className="mt-3 text-[15px]">{p.blurb}</p>
              <ul className="mt-4 space-y-1.5 text-[15px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-3">—</span>{f}</li>
                ))}
              </ul>
              <Link href="/business" className="mt-5 inline-flex h-10 items-center bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900">Upgrade from your dashboard</Link>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-2">Claim your listing first (free), then choose a plan from your <Link href="/business" className="underline underline-offset-4">business dashboard</Link>. Invoices are issued instantly; plans activate on payment.</p>
      </section>

      <section className="mt-14">
        <h2 className="rule pt-3 font-serif text-2xl">Sponsored content</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {content.map((p) => (
            <div key={p.code} className="border-t-2 border-line pt-4">
              <p className="eyebrow">{p.name}</p>
              <p className="mt-2 font-serif text-3xl tabular">{pkr(p.pricePkr)}</p>
              <p className="mt-3 text-[15px]">{p.blurb}</p>
              <ul className="mt-4 space-y-1.5 text-[15px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-3">—</span>{f}</li>
                ))}
              </ul>
              <Link href={`/write-for-us?kind=${p.code === "press-release" ? "press_release" : "sponsored"}`} className="mt-5 inline-flex h-10 items-center bg-ink-900 px-4 text-sm font-medium text-white hover:bg-ink-800 dark:bg-white dark:text-ink-900">Submit a {p.name.toLowerCase()}</Link>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-2">Prefer to contribute without paying? Genuinely useful guest articles are published free with a byline — see <Link href="/write-for-us" className="underline underline-offset-4">write for us</Link>.</p>
      </section>

      <section className="mt-14">
        <h2 className="rule pt-3 font-serif text-2xl">Placements</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {placements.map((p) => (
            <div key={p.code} className="border-t-2 border-line pt-4">
              <p className="eyebrow">{p.name}</p>
              <p className="mt-2 font-serif text-3xl tabular">{pkr(p.pricePkr)} <span className="text-base text-3">/ month</span></p>
              <p className="mt-3 text-[15px]">{p.blurb}</p>
              <ul className="mt-4 space-y-1.5 text-[15px]">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><span className="text-3">—</span>{f}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="border-t-2 border-line pt-4">
            <p className="eyebrow">Newsletter & display</p>
            <p className="mt-3 text-[15px]">Searchable Daily sponsorship (one sponsor per issue) and display advertising are sold directly. Email <a href="mailto:ads@searchable.pk" className="underline underline-offset-4">ads@searchable.pk</a> with what you sell and where; we reply with audience numbers and a rate card.</p>
          </div>
        </div>
      </section>

      <section className="mt-14">
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
    </div>
  );
}
