import { PhotoTile } from "@/components/photo-tiles";
import { SectionHeader } from "@/components/ui";
import { CARS } from "@/content/cars";
import { INVERTERS } from "@/content/inverters";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Compare: Cars, Solar Inverters and More, Side by Side",
  description: "Structured comparisons with prices and the specs that matter: new cars in Pakistan, solar inverters, and more to come. Filter, pick three, compare.",
  path: "/compare",
  kicker: "Compare",
});

const PAGES = [
  { href: "/compare/cars", title: "New cars", meta: `${CARS.length} models · ex-factory prices, engine, economy, airbags`, imageUrl: null },
  { href: "/compare/solar-inverters", title: "Solar inverters", meta: `${INVERTERS.length} models · hybrid, on-grid, off-grid · prices and warranty`, imageUrl: null },
];

export default function CompareHub() {
  return (
    <div className="container-x py-8 sm:py-12">
      <SectionHeader as="h1" eyebrow="Compare" title="Compare before you buy" description="Prices and specifications in one table, filters that match how people actually shop (budget, type, fuel), and a side-by-side view for the final three. Reviewed on a schedule; every page shows its date and source." />
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {PAGES.map((p) => (
          <PhotoTile key={p.href} href={p.href} title={p.title} meta={p.meta} imageUrl={p.imageUrl} aspect="3/2" />
        ))}
      </div>
      <p className="mt-10 max-w-2xl text-[15px] text-2">Coming next: bank accounts and profit rates, mobile and internet packages, universities, motorcycles, health insurance. Suggest one at <a href="mailto:editorial@searchable.pk" className="underline underline-offset-4">editorial@searchable.pk</a>.</p>
    </div>
  );
}
