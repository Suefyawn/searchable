import type { Metadata } from "next";
import { LensMark, Wordmark } from "@/components/brand";
import { Breadcrumbs, SectionHeader } from "@/components/ui";
import { buildMetadata } from "@/lib/seo";
import { readSiteSettings } from "@/lib/site-settings";
import { SITE } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({ title: "Brand kit", description: `${SITE.name}'s mark, wordmark, colours and type, with the rules for using them.`, path: "/brand", noindex: true });

const SWATCHES: { key: "ink" | "slate" | "accent" | "link" | "primary"; name: string; use: string }[] = [
  { key: "ink", name: "Ink", use: "Headlines, body type, strong rules, the breaking bar" },
  { key: "slate", name: "Slate", use: "Secondary text; the greys are tints of it" },
  { key: "accent", name: "Accent", use: "Carousel timer, live dot, chart line, highlights" },
  { key: "link", name: "Link", use: "Links, eyebrow labels, chips" },
  { key: "primary", name: "Primary", use: "Buttons and the darkest brand tone" },
];

/** The brand kit as a page: assets to download, the palette in force, the type, and the rules. */
export default async function BrandPage() {
  const s = await readSiteSettings();
  return (
    <div className="container-x py-8 sm:py-12">
      <Breadcrumbs items={[{ name: "About", path: "/about" }, { name: "Brand kit", path: "/brand" }]} className="mb-4" />
      <SectionHeader as="h1" title="Brand kit" description="The mark, the wordmark, the colours and the type, for anyone who needs to show Searchable: partners, press, the newsletter, a slide." />

      <section className="mt-10">
        <h2 className="eyebrow mb-3 border-b-2 border-[var(--rule)] pb-1.5">Mark and wordmark</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="border border-line p-6">
            <LensMark size={64} />
            <p className="mt-4 text-[14px] font-medium">Square lens, navy and teal</p>
            <p className="text-[13px] text-3">
              <a href="/brand/mark.svg" download className="underline underline-offset-4">
                mark.svg
              </a>{" "}
              · <a href="/icon-512.png" download className="underline underline-offset-4">icon-512.png</a>
            </p>
          </div>
          <div className="border border-line bg-ink-900 p-6 text-white">
            <LensMark size={64} tone="current" className="text-white" />
            <p className="mt-4 text-[14px] font-medium">Square lens, white</p>
            <p className="text-[13px] opacity-70">
              <a href="/brand/mark-white.svg" download className="underline underline-offset-4">
                mark-white.svg
              </a>
            </p>
          </div>
          <div className="border border-line p-6">
            <Wordmark size={30} href={null} />
            <p className="mt-4 text-[14px] font-medium">Wordmark</p>
            <p className="text-[13px] text-3">Lowercase Geist 600, tracked tight, the .pk in the link blue. Never stretched, recoloured or set on a photo.</p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow mb-3 border-b-2 border-[var(--rule)] pb-1.5">Colour</h2>
        <div className="grid gap-3 sm:grid-cols-5">
          {SWATCHES.map((w) => (
            <div key={w.key} className="border border-line">
              <div className="h-24" style={{ background: s.brand[w.key] }} />
              <div className="p-3">
                <p className="text-[14px] font-medium">{w.name}</p>
                <p className="font-mono text-[12.5px] uppercase text-2">{s.brand[w.key]}</p>
                <p className="mt-1 text-[12.5px] text-3">{w.use}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 max-w-[70ch] text-[14px] text-2">White paper, ink type, one blue for links and one teal for movement. Everything else on the site (panels, borders, chips, hover states) is mixed from these five, so a change in one place carries everywhere. No gradients, no rounded corners, no glass.</p>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow mb-3 border-b-2 border-[var(--rule)] pb-1.5">Type</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="border border-line p-6">
            <p className="font-display text-4xl leading-tight">Geist 600</p>
            <p className="mt-2 text-[14px] text-2">Headlines, deks, pull figures. Weight 600, letter-spacing -0.022em, tight leading, balanced wrapping.</p>
          </div>
          <div className="border border-line p-6">
            <p className="text-4xl leading-tight">Geist 400 and 500</p>
            <p className="mt-2 text-[14px] text-2">Everything else: body at 16 to 18 px, labels in small caps with 0.14em tracking, numbers with tabular figures. One family across the site.</p>
          </div>
        </div>
      </section>

      <section className="mt-10 max-w-[70ch]">
        <h2 className="eyebrow mb-3 border-b-2 border-[var(--rule)] pb-1.5">Rules</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-2">
          <li>Write the name as Searchable, or searchable.pk when the address matters. Not SearchAble, not Searchable.PK.</li>
          <li>Clear space around the mark of at least half its height; minimum size 20 px on screen.</li>
          <li>Black mark on white, white mark on ink or a photo with enough contrast. Never the mark in the accent colours.</li>
          <li>Hairline rules, 2 px section rules in ink, square corners. Photos are real and credited; no AI imagery.</li>
          <li>Tagline: {s.identity.tagline}</li>
        </ul>
      </section>
    </div>
  );
}
