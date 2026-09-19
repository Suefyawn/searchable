import { LivingPage, livingMetadata, type LivingPageDef } from "@/components/compare/living-page";
import { readLivingSet } from "@/lib/compare-data";

export const revalidate = 3600;

const DEF: LivingPageDef = {
  slug: "national-savings",
  name: "National Savings schemes",
  title: "National Savings profit rates: every scheme compared",
  seoTitle: "National Savings Profit Rates 2026: Every Scheme Compared",
  description: "Every National Savings (CDNS) scheme on one page: profit rate, payout, term, minimum and maximum, who can buy and withholding tax, from the official rate sheet.",
  intro: "Rates from the Central Directorate of National Savings' published sheet, with the withholding rules that decide what you actually receive.",
  priceWord: "profit rate",
  tools: ["national-savings-calculator", "zakat-calculator"],
  related: [
    { href: "/data/sbp-policy-rate", label: "SBP policy rate today" },
    { href: "/guides/banking/prize-bond-draw-schedule-2026-and-how-to-check-your-bond-number", label: "Prize bond draw schedule" },
    { href: "/tools/tax/income-tax-calculator", label: "Income tax on your salary" },
  ],
  faqs: [
    { question: "Which National Savings scheme pays the most?", answer: "Behbood Savings Certificates and the Pensioners' Benefit Account carry the highest rate and are exempt from withholding, but they are limited to senior citizens, widows, persons with disabilities and retired government employees, with a cap per person. For everyone else the Regular Income Certificate pays monthly and the Defence Savings Certificate compounds over ten years." },
    { question: "How much tax is taken from the profit?", answer: "Withholding under section 151 at 15% for filers and 35% for non-filers on most schemes; Behbood and the Pensioners' Benefit Account are exempt from withholding, with a reduced final tax rate for filers instead. Being on the Active Taxpayers List more than doubles what a non-filer keeps." },
    { question: "How often do the rates change?", answer: "CDNS revises them after State Bank policy decisions, usually every two to three months. The date on this page is the rate sheet in force; certificates bought earlier keep the rate they were issued at." },
    { question: "Can I buy online?", answer: "Accounts and certificates are opened at National Savings Centres with a CNIC; the Digital Savings app lets existing account holders invest and encash. Profit is paid to a bank account or at the centre." },
  ],
  howWeCompiled: "Every rate is read from the Central Directorate of National Savings' published profit-rate sheet on the review date, with the effective date the sheet carries. Minimums, maximums and eligibility come from the scheme rules on savings.gov.pk. The table is refreshed whenever CDNS publishes a new sheet, which follows State Bank policy decisions.",
};

export async function generateMetadata() {
  const set = await readLivingSet(DEF.slug);
  return livingMetadata(DEF, set.items.length);
}

export default function Page() {
  return <LivingPage def={DEF} />;
}
