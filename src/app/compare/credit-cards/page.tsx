import { LivingPage, livingMetadata, type LivingPageDef } from "@/components/compare/living-page";
import { readLivingSet } from "@/lib/compare-data";

export const revalidate = 3600;

const DEF: LivingPageDef = {
  slug: "credit-cards",
  name: "Credit cards",
  title: "Credit cards in Pakistan compared: fees, mark-up, minimum income",
  seoTitle: "Credit Cards in Pakistan 2026: Fees, Mark-up, Rewards",
  description: "Credit cards from HBL, UBL, MCB, Meezan, Bank Alfalah, Standard Chartered, Faysal and others compared on annual fee, mark-up rate, minimum income, cashback, lounge access and fuel discounts, from the banks' published schedules of charges.",
  intro: "Annual fees and mark-up from each bank's published schedule of charges, the income it asks for, and what the card gives back.",
  priceWord: "annual fee and mark-up rate",
  tools: ["personal-loan-calculator", "income-tax-calculator"],
  related: [
    { href: "/tools/finance/cash-withdrawal-tax-calculator", label: "Tax on cash withdrawals" },
    { href: "/data/sbp-policy-rate", label: "SBP policy rate today" },
    { href: "/data/kibor-1y", label: "KIBOR today" },
  ],
  faqs: [
    { question: "What does a credit card cost if I pay in full every month?", answer: "Only the annual fee, and often nothing in the first year. Mark-up applies only to a balance carried past the due date; the rates here are the banks' published annual rates, charged monthly on the outstanding amount." },
    { question: "What income do banks ask for?", answer: "Each card has a minimum monthly income, typically from Rs 30,000 to Rs 50,000 for entry cards and Rs 150,000 and up for platinum and lounge cards, with a salary slip or bank statement as proof. Salary-transfer customers of the same bank get easier approval." },
    { question: "Are Islamic credit cards different?", answer: "They are structured on Tawarruq or Ujrah rather than interest: a fixed monthly fee or a profit rate on the financing, with the same repayment discipline. The cost of carrying a balance is comparable; the cards here show the bank's stated rate." },
    { question: "Does the card affect my filer status or tax?", answer: "No, but non-filers pay higher withholding on some card transactions abroad and on cash withdrawals. Being on the Active Taxpayers List is worth it before travelling on the card." },
  ],
  howWeCompiled: "Every figure comes from the issuing bank's current schedule of charges and the card's own page, read on the review date; promotional first-year waivers are noted as such. Rates change with the policy rate, so the table is refreshed after every SBP monetary policy decision and at least monthly.",
};

export async function generateMetadata() {
  const set = await readLivingSet(DEF.slug);
  return livingMetadata(DEF, set.items.length);
}

export default function Page() {
  return <LivingPage def={DEF} />;
}
