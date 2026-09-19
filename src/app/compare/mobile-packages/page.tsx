import { LivingPage, livingMetadata, type LivingPageDef } from "@/components/compare/living-page";
import { readLivingSet } from "@/lib/compare-data";

export const revalidate = 3600;

const DEF: LivingPageDef = {
  slug: "mobile-packages",
  name: "Mobile packages",
  title: "Mobile packages compared: Jazz, Zong, Telenor and Ufone",
  seoTitle: "Mobile Packages Pakistan 2026: Jazz, Zong, Telenor, Ufone",
  description: "Monthly, weekly and daily bundles from Jazz, Zong, Telenor and Ufone compared on price, data, on-net and off-net minutes, SMS and validity, with the rupees-per-GB figure worked out, from the operators' own package pages.",
  intro: "Price, data, minutes and validity from each operator's own package page, with the rupees-per-GB figure the operators never print.",
  priceWord: "price and allowance",
  tools: ["mobile-load-tax-calculator"],
  related: [
    { href: "/guides/telecom/how-to-check-sims-registered-on-your-cnic-668-sms-and-cnicsimspk", label: "Check the SIMs on your CNIC" },
    { href: "/pta", label: "PTA phone tax and registration" },
  ],
  faqs: [
    { question: "Why is the price on the bill higher than the package price?", answer: "Advance income tax (15% for filers, 75% for non-filers on the load since 2025-26) and provincial sales tax on services are taken from the load before the package is deducted, so a Rs 1,000 load buys less than Rs 1,000 of package. The load tax calculator shows the exact figure." },
    { question: "Does data carry over when the package expires?", answer: "No. Unused data, minutes and SMS lapse at the end of the validity; a new subscription starts from zero. Some operators sell add-ons for the last days at a worse rate." },
    { question: "Which network is cheapest per GB?", answer: "It changes with each operator's monthly offers, which is why this page shows rupees per GB and is refreshed twice a month rather than naming a winner." },
    { question: "Are these prices the same in every city?", answer: "Operators run location-based offers, so the app may show you a cheaper or different bundle than the national package page. Those are not listed here because they cannot be cited." },
  ],
  howWeCompiled: "Packages are read from each operator's own package pages on the review date (the national prepaid bundles, not app-only or location offers), with the subscription code as the operator prints it. Rupees per GB is the package price divided by the data allowance, before load taxes. Refreshed on the 1st and 16th of the month; a package the operator no longer lists is removed.",
};

export async function generateMetadata() {
  const set = await readLivingSet(DEF.slug);
  return livingMetadata(DEF, set.items.length);
}

export default function Page() {
  return <LivingPage def={DEF} />;
}
