import { LivingPage, livingMetadata, type LivingPageDef } from "@/components/compare/living-page";
import { readLivingSet } from "@/lib/compare-data";

export const revalidate = 3600;

const DEF: LivingPageDef = {
  slug: "air-conditioners",
  name: "Air conditioners",
  title: "AC prices in Pakistan: inverter air conditioners compared",
  seoTitle: "AC Prices in Pakistan 2026: 1, 1.5 and 2 Ton Inverters",
  description: "Inverter and non-inverter air conditioners from Haier, Gree, Dawlance, Orient, Kenwood and others with brand-list prices, tonnage, EER, T3 rating and warranty. Filter by tonnage and brand, compare three, and see the monthly running cost on your tariff.",
  intro: "Brand list prices, the efficiency figures the brands publish, and a link to what each one costs to run on your tariff.",
  priceWord: "brand list price",
  tools: ["ac-running-cost-calculator", "electricity-bill-calculator"],
  related: [
    { href: "/electricity", label: "Electricity bill check and tariff" },
    { href: "/compare/solar-inverters", label: "Solar inverters compared" },
    { href: "/data/solar-panel-price", label: "Solar panel price per watt" },
  ],
  faqs: [
    { question: "Which AC tonnage do I need?", answer: "About 1 ton for a room up to 120 square feet, 1.5 ton up to 180 square feet, 2 ton up to 250 square feet, with a size up for a top floor, west-facing windows or Karachi humidity. An undersized unit runs flat out and costs more, not less." },
    { question: "Is an inverter AC worth the extra price?", answer: "For anyone running it more than three or four hours a day, yes: an inverter unit uses roughly a third less electricity than a fixed-speed one over a season, and at unprotected slab rates that gap pays back the price difference in one or two summers. The running cost calculator shows the monthly figure for your tariff." },
    { question: "What does T3 mean?", answer: "A T3-rated compressor is tested to keep cooling at outdoor temperatures of 46 to 55°C, which is what Multan, Jacobabad and Sibi hit in June. Non-T3 units cut out or lose capacity in that heat." },
    { question: "Why are prices different in shops?", answer: "The prices here are the brands' own list prices on the review date. Retailers discount, bundle installation, or charge extra for copper piping and a stand; ask for the total installed price before comparing." },
  ],
  howWeCompiled: "Models and prices are taken from each brand's own price list or online store on the review date, not from marketplaces, and the efficiency and warranty figures from the brand's specification sheet. Prices are refreshed monthly and after budget or tariff changes; a model whose brand no longer lists it is removed.",
};

export async function generateMetadata() {
  const set = await readLivingSet(DEF.slug);
  return livingMetadata(DEF, set.items.length);
}

export default function Page() {
  return <LivingPage def={DEF} />;
}
