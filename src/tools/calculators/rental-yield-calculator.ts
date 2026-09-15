import { num, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const rentalYieldCalculator: ToolDefinition = {
  slug: "rental-yield-calculator",
  category: "property",
  name: "Rental Yield Calculator",
  seoTitle: "Rental Yield Calculator Pakistan: Gross and Net Yield, Payback Years, Rent vs Price for Plots, Flats and Houses",
  shortName: "Rental yield",
  description: "Is that property worth it as an investment? Enter the price, the monthly rent and the running costs to see gross and net rental yield, how many years the rent takes to repay the price, and how it compares with a bank deposit.",
  keywords: ["rental yield calculator", "rental yield pakistan", "roi on property pakistan", "rent vs buy pakistan", "investment property calculator", "gross yield net yield", "flat investment karachi", "house rent return", "property investment return 2026", "rental income calculator"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  sources: [{ title: "Standard real-estate yield arithmetic; comparison rate from the SBP policy rate on the data hub", publisher: "Searchable" }],
  fields: [
    { key: "price", label: "Purchase price", type: "number", unit: "PKR", default: 25_000_000, min: 0, step: 100_000 },
    { key: "rent", label: "Monthly rent", type: "number", unit: "PKR", default: 90_000, min: 0, step: 1000 },
    { key: "vacancy", label: "Vacant weeks per year", type: "number", default: 4, min: 0, max: 52, step: 1, help: "Between tenants. Four weeks is a fair average for flats." },
    { key: "costs", label: "Yearly costs", type: "number", unit: "PKR", default: 150_000, min: 0, step: 5000, help: "Property tax, society charges, repairs, agent's commission (usually one month's rent on a new tenant)." },
    { key: "compare", label: "Bank deposit rate to compare", type: "number", unit: "%", default: 10, min: 0, max: 30, step: 0.25, help: "A one-year term deposit or National Savings rate." },
  ],
  compute(input) {
    const price = Math.max(0, num(input, "price", 0));
    const rent = Math.max(0, num(input, "rent", 0));
    const vacancy = Math.min(52, Math.max(0, num(input, "vacancy", 4)));
    const costs = Math.max(0, num(input, "costs", 0));
    const compare = Math.max(0, num(input, "compare", 10)) / 100;
    const grossAnnual = rent * 12;
    const collected = grossAnnual * (1 - vacancy / 52);
    const net = collected - costs;
    const grossYield = price ? grossAnnual / price : 0;
    const netYield = price ? net / price : 0;
    const payback = net > 0 ? price / net : Infinity;
    const bank = price * compare;
    return {
      headline: { label: "Net rental yield", value: `${(netYield * 100).toFixed(2)}% a year`, primary: true },
      summary: `${pkr(rent)} a month is ${pkr(grossAnnual)} a year, ${(grossYield * 100).toFixed(2)}% gross on ${pkr(price)}. After ${vacancy} vacant week${vacancy === 1 ? "" : "s"} and ${pkr(costs)} of costs the net is ${pkr(Math.round(net))}, ${(netYield * 100).toFixed(2)}%. ${Number.isFinite(payback) ? `Rent alone repays the price in about ${payback.toFixed(0)} years.` : "Rent does not cover the costs."} ${bank > net ? `The same money in a ${(compare * 100).toFixed(2)}% deposit would earn ${pkr(Math.round(bank))}, so the case rests on capital gains.` : `That beats a ${(compare * 100).toFixed(2)}% deposit (${pkr(Math.round(bank))}) before any capital gain.`}`,
      sections: [
        {
          title: "Per year",
          lines: [
            { label: "Rent if fully let", value: pkr(grossAnnual) },
            { label: "Rent after vacancy", value: pkr(Math.round(collected)) },
            { label: "Costs", value: pkr(costs) },
            { label: "Net income", value: pkr(Math.round(net)), primary: true },
          ],
        },
        {
          title: "Returns",
          lines: [
            { label: "Gross yield", value: `${(grossYield * 100).toFixed(2)}%` },
            { label: "Net yield", value: `${(netYield * 100).toFixed(2)}%`, primary: true },
            { label: "Years for rent to repay the price", value: Number.isFinite(payback) ? payback.toFixed(1) : "never" },
            { label: `Bank deposit at ${(compare * 100).toFixed(2)}%`, value: pkr(Math.round(bank)), muted: true },
          ],
        },
      ],
      warnings: ["Rental income is taxable: for individuals it is added to other income under the normal slabs (Finance Act 2024 removed the separate property-income schedule), and tenants who are companies or AOPs withhold tax under section 155. Capital gains on sale are taxed under section 37 depending on the holding period and filer status; see the CGT calculator."],
    };
  },
  methodology: `- **Gross yield** = annual rent ÷ purchase price.
- **Net yield** = (annual rent × (1 − vacant weeks ÷ 52) − yearly costs) ÷ purchase price.
- **Payback** = purchase price ÷ net annual income.
- The comparison line applies the deposit rate you enter to the same capital.

Yields in Pakistani cities are low by world standards (typically 2% to 5% gross for houses, 5% to 8% for flats and shops) because prices are driven by expected capital gains and by land as a store of value; that is exactly why the net figure and the deposit comparison matter before you buy to let.`,
  faqs: [
    { question: "What is a good rental yield in Pakistan?", answer: "Flats and shops in Karachi, Lahore and Islamabad usually gross 5% to 8%; houses in DHA and Bahria often 2% to 4%. Anything under the bank deposit rate is a bet on price growth, not income." },
    { question: "Which costs should I include?", answer: "Property tax (annual), society or maintenance charges, repairs (budget 1% of the price a year for older buildings), the agent's commission when you find a tenant, and insurance if any." },
    { question: "How is rent taxed?", answer: "Rental income is added to your other income and taxed at the normal individual slabs, with deductions for repairs (a fixed share), property tax and insurance. Company tenants deduct withholding tax on the rent." },
    { question: "Does the calculator include capital gains?", answer: "No. It measures income only. Use the capital gains tax calculator to see what a future sale would cost." },
  ],
  related: { tools: ["capital-gains-tax-calculator", "property-tax-calculator", "home-loan-calculator", "national-savings-calculator"], businessCategories: ["property-dealers"] },
};
