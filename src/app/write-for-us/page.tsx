import Link from "next/link";
import { PitchForm } from "@/components/pitch-form";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { PRODUCTS } from "@/content/pricing";
import { listCategories } from "@/db/queries/content";
import { pkr } from "@/lib/format";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";

export const revalidate = 3600;

const FAQS = [
  { question: "Do you pay for guest posts?", answer: "No, and we do not charge for them either. A guest article is published free with your name and a short bio (one nofollow link to your organisation). If you want followed links to a commercial site, that is a sponsored article." },
  { question: "What do you accept?", answer: "Practical, specific, Pakistan-focused pieces: how a process actually works, what something costs, what changed and what to do about it. Written from real experience: a tax practitioner on filing, an installer on solar sizing, an HR manager on EOBI. Not accepted: generic listicles, rewritten press coverage, AI-written filler, anything promotional dressed as advice." },
  { question: "How long until it is published?", answer: "Pitches get a reply within 5 working days. Accepted drafts are edited and published within 2 weeks; sponsored articles within 5 working days of payment." },
  { question: "Will you edit my article?", answer: "Yes. We edit for clarity, structure and accuracy, add sources and links to our tools where they help the reader, and send you the final version before it goes live." },
  { question: "Can I republish it on my own site?", answer: "After 30 days, with a canonical link back to Searchable." },
];

export const metadata = buildMetadata({
  title: "Write for Searchable: Guest Posts, Sponsored Articles & Press Releases (Guidelines & Submission)",
  description: "Contribute a practical guide about taxes, banking, cars, property, utilities or business in Pakistan, free with a byline, or submit a sponsored article or press release. Guidelines, what we accept, and the form.",
  path: "/write-for-us",
  kicker: "Write for us",
});

export default async function WriteForUsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const cats = await listCategories("guide");
  const sponsored = PRODUCTS.find((p) => p.code === "sponsored-post")!;
  const press = PRODUCTS.find((p) => p.code === "press-release")!;
  const crumbs = [{ name: "Write for us", path: "/write-for-us" }];

  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(FAQS)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow="Write for us" title="Know how something really works in Pakistan? Write it up." description="We publish practical guides from people who do the thing for a living: tax practitioners, installers, bankers, lawyers, teachers. Guest articles are free and carry your byline. Companies can also submit sponsored articles and press releases, clearly labelled." />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-10">
          <section>
            <h2 className="rule pt-3 font-display text-2xl">Three ways to appear on Searchable</h2>
            <div className="mt-4 divide-y divide-[var(--border)] border-y border-line">
              <div className="grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[11rem_1fr_auto]">
                <p className="font-medium">Guest article</p>
                <p className="text-[15px] text-2">A useful, original guide. Your name and a one-line bio at the bottom, one nofollow link to your organisation. Edited by our desk.</p>
                <p className="text-sm tabular text-3">Free</p>
              </div>
              <div className="grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[11rem_1fr_auto]">
                <p className="font-medium">Sponsored article</p>
                <p className="text-[15px] text-2">{sponsored.blurb} Labelled Sponsored; links are rel=sponsored.</p>
                <p className="text-sm tabular text-3">{pkr(sponsored.pricePkr)}</p>
              </div>
              <div className="grid gap-x-6 gap-y-1 py-4 sm:grid-cols-[11rem_1fr_auto]">
                <p className="font-medium">Press release</p>
                <p className="text-[15px] text-2">{press.blurb}</p>
                <p className="text-sm tabular text-3">{pkr(press.pricePkr)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-2">Full pricing and listing plans are on the <Link href="/advertise" className="underline underline-offset-4">advertise page</Link>.</p>
          </section>

          <section>
            <h2 className="rule pt-3 font-display text-2xl">What gets accepted</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[16px] leading-relaxed">
              <li><strong>Specific and practical.</strong> “How to get a sales tax refund as an exporter” beats “Tax tips for businesses”. Include fees, timelines, forms, and what goes wrong.</li>
              <li><strong>From experience.</strong> Say what you do and how you know. We may ask for a quick call to verify.</li>
              <li><strong>Original.</strong> Not published elsewhere, not rewritten from another site, not generated by a model. We check.</li>
              <li><strong>Sourced.</strong> Cite the law, notification, tariff or official page. We add links to our calculators and data where they help.</li>
              <li><strong>800–1,500 words</strong>, plain English (Roman Urdu terms welcome where people actually use them), ## headings, a short FAQ at the end.</li>
            </ul>
            <p className="mt-4 text-[15px] text-2">We decline generic listicles, promotional pieces dressed as advice, and anything on politics or religion. Read the <Link href="/editorial-policy" className="underline underline-offset-4">editorial policy</Link>.</p>
          </section>

          <section id="submit">
            <h2 className="rule pt-3 font-display text-2xl">Submit</h2>
            <div className="mt-5">
              <PitchForm initialKind={kind} categories={cats.map((c) => ({ slug: c.slug, name: c.name }))} />
            </div>
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
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">Topics we want</p>
            <ul className="mt-2 space-y-1.5 text-2">
              <li>Sales tax registration and refunds for SMEs</li>
              <li>EOBI, PESSI and payroll compliance</li>
              <li>Import duties on used cars and machinery</li>
              <li>Property transfer inside DHA, Bahria and societies</li>
              <li>Freelancer taxation and PSEB registration</li>
              <li>School admissions, O/A-level costs</li>
              <li>Health insurance and Sehat Card in practice</li>
              <li>Agricultural loans and tube-well solarisation</li>
            </ul>
          </div>
          <div className="border border-line p-4 text-[15px]">
            <p className="eyebrow">Questions</p>
            <p className="mt-2 text-2">
              <a href="mailto:editorial@searchable.pk" className="underline underline-offset-4">editorial@searchable.pk</a> for pitches, <a href="mailto:ads@searchable.pk" className="underline underline-offset-4">ads@searchable.pk</a> for sponsored content.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
