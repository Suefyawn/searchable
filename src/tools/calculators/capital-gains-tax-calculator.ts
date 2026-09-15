import { CURRENT_TAX_YEAR, computeIncomeTax } from "../data/income-tax";
import { CGT_POST_2024, CGT_PRE_2024, cgtRatePre2024, FEDERAL_SOURCES, REVIEWED_AT, WHT_236C, wht236C, type PropertyKind } from "../data/property-tax";
import { bool, num, str, type ToolDefinition } from "../types";
import { pct, pkr } from "@/lib/format";

function kindOf(v: string): PropertyKind {
  return v === "constructed" || v === "flat" ? v : "plot";
}

export const capitalGainsTaxCalculator: ToolDefinition = {
  slug: "capital-gains-tax-calculator",
  category: "tax",
  name: "Capital Gains Tax on Property Calculator 2026-27",
  seoTitle: "Capital Gains Tax on Property Calculator Pakistan 2026-27: CGT on Plot, House & Flat Sale (Filer vs Non-Filer)",
  shortName: "Property CGT",
  description: "Work out the capital gains tax when you sell a plot, house or flat in Pakistan: 15% flat for filers on property bought after 1 July 2024, the holding-period table for older property, the 236C tax withheld at transfer, and what you actually keep.",
  keywords: ["capital gain tax on property", "capital gains tax on property in pakistan", "cgt on property pakistan", "capital gains tax calculator pakistan", "tax on property sale pakistan", "section 37(1a)", "holding period property tax", "cgt on plot sale", "236c tax", "property sale tax calculator"],
  version: "1.0.0",
  lastReviewed: REVIEWED_AT,
  featured: true,
  sources: FEDERAL_SOURCES,
  fields: [
    { key: "cost", label: "Purchase price (cost)", type: "number", unit: "PKR", default: 10_000_000, min: 0, step: 100_000, help: "What you paid, plus registration and stamp costs and documented improvements. Inherited or gifted property: the fair market value at the date of death / gift." },
    { key: "sale", label: "Sale price", type: "number", unit: "PKR", default: 15_000_000, min: 0, step: 100_000, help: "Consideration received. If the FBR valuation-table value is higher, FBR treats that as the sale value." },
    { key: "expenses", label: "Selling expenses", type: "number", unit: "PKR", default: 0, min: 0, step: 10_000, help: "Commission, legal fees and society transfer charges you paid to sell. Optional." },
    {
      key: "acquired",
      label: "Property was bought",
      type: "select",
      options: [
        { value: "post", label: "On or after 1 July 2024" },
        { value: "pre", label: "Before 1 July 2024" },
      ],
      default: "post",
      help: "Finance Act 2024 removed the holding-period relief for property acquired from 1 July 2024.",
    },
    {
      key: "kind",
      label: "Property type",
      type: "select",
      options: [
        { value: "plot", label: "Open plot / land" },
        { value: "constructed", label: "House / constructed property" },
        { value: "flat", label: "Flat / apartment" },
      ],
      default: "plot",
      help: "Only matters for property bought before 1 July 2024.",
    },
    { key: "years", label: "Years held", type: "number", unit: "years", default: 3, min: 0, max: 60, step: 0.5, help: "From purchase (or allotment / possession, whichever FBR treats as acquisition) to sale. Only matters for property bought before 1 July 2024." },
    {
      key: "filer",
      label: "Seller's FBR status on the date of sale",
      type: "select",
      options: [
        { value: "filer", label: "Filer (on Active Taxpayer List)" },
        { value: "nonfiler", label: "Non-filer" },
      ],
      default: "filer",
    },
    { key: "adjust236c", label: "Show 236C tax withheld at transfer", type: "boolean", default: true, help: "The sub-registrar / society collects advance tax under s.236C on the sale value. Filers adjust it against the CGT due." },
  ],
  compute(input) {
    const cost = Math.max(0, num(input, "cost"));
    const sale = Math.max(0, num(input, "sale"));
    const expenses = Math.max(0, num(input, "expenses"));
    const post = str(input, "acquired", "post") !== "pre";
    const kind = kindOf(str(input, "kind", "plot"));
    const years = Math.max(0, num(input, "years", 0));
    const filer = str(input, "filer", "filer") !== "nonfiler";
    const show236c = bool(input, "adjust236c", true);
    const gain = sale - cost - expenses;
    const warnings: string[] = [];

    // Rate and tax
    let rate: number;
    let tax: number;
    let rateNote: string;
    if (post) {
      if (filer) {
        rate = CGT_POST_2024.filer;
        tax = Math.max(0, gain) * rate;
        rateNote = "Flat 15%, no holding-period relief for property acquired on or after 1 July 2024 (s.37(1A), Finance Act 2024).";
      } else {
        const slabTax = computeIncomeTax(Math.max(0, gain), CURRENT_TAX_YEAR, "nonSalaried").totalTax;
        const floor = Math.max(0, gain) * CGT_POST_2024.nonFilerMinimum;
        tax = Math.max(slabTax, floor);
        rate = gain > 0 ? tax / gain : CGT_POST_2024.nonFilerMinimum;
        rateNote = `Non-filers pay Division I slab rates on the gain (computed here as if the gain were your only income: ${pkr(slabTax)}), but never less than 15% (${pkr(floor)}).`;
        warnings.push("Non-filer CGT is taxed at normal slab rates; if you have other income in the year the slab tax on the gain will be higher than shown.");
      }
    } else {
      rate = cgtRatePre2024(kind, years);
      tax = Math.max(0, gain) * rate;
      const label = { plot: "open plot", constructed: "constructed property", flat: "flat" }[kind];
      rateNote = rate === 0 ? `Held more than ${kind === "plot" ? 6 : kind === "constructed" ? 4 : 2} years, gain on a ${label} is exempt under the pre-2024 holding-period table.` : `${pct(rate)} for a ${label} held ${years} year${years === 1 ? "" : "s"} (Division VIII table that continues to apply to property acquired before 1 July 2024).`;
      if (!filer) warnings.push("For property bought before July 2024 the holding-period rates apply regardless of filer status; your 236C withholding is still higher as a non-filer.");
    }
    tax = Math.round(tax);
    if (gain <= 0) warnings.push("No gain, no CGT. A loss on immovable property cannot be set off against other income.");
    if (sale > 0 && cost > 0 && sale < cost * 0.5) warnings.push("Sale price is far below cost, FBR will substitute the valuation-table value if it is higher than the declared price.");

    // 236C withheld
    const c236 = Math.round(sale * wht236C(filer));
    const balance = tax - c236;

    return {
      headline: { label: "Capital gains tax due", value: pkr(tax), primary: true },
      summary: gain > 0 ? `Gain of ${pkr(gain)} on a ${pkr(sale)} sale. ${rateNote}${show236c && filer ? ` The ${pkr(c236)} withheld under s.236C at transfer is adjustable, leaving ${balance >= 0 ? pkr(balance) + " to pay with your return" : pkr(-balance) + " refundable"}.` : ""}` : `You made no gain on this sale (${pkr(gain)}), so no capital gains tax is due.`,
      sections: [
        {
          title: "Gain",
          lines: [
            { label: "Sale price", value: pkr(sale) },
            { label: "Less cost of acquisition", value: `− ${pkr(cost)}` },
            ...(expenses ? [{ label: "Less selling expenses", value: `− ${pkr(expenses)}` }] : []),
            { label: "Capital gain", value: pkr(gain), primary: true },
          ],
        },
        {
          title: "Tax",
          lines: [
            { label: "Applicable rate", value: pct(rate), note: rateNote },
            { label: "Capital gains tax", value: pkr(tax), primary: true },
            { label: "You keep after CGT", value: pkr(sale - expenses - tax), muted: true },
          ],
        },
        ...(show236c
          ? [
              {
                title: `Advance tax at transfer (s.236C, ${filer ? "filer" : "non-filer"})`,
                lines: [
                  { label: `${pct(wht236C(filer), 2)} of ${pkr(sale)} withheld by the registrar`, value: pkr(c236) },
                  filer
                    ? { label: balance >= 0 ? "Balance CGT to pay with your return" : "Refund / carry-forward from excess withholding", value: pkr(Math.abs(balance)) }
                    : { label: "Non-filer: 236C is on top of CGT unless you file and claim it", value: pkr(tax + c236), note: "Filing a return and getting on the ATL before the sale cuts 236C from 11.5% to 2.75%." },
                ],
              },
            ]
          : []),
        ...(!post
          ? [
              {
                title: "Pre-July-2024 holding-period table",
                lines: CGT_PRE_2024.map((b, i) => ({
                  label: b.maxYears === null ? "More than 6 years" : `${i === 0 ? "Up to " : `${CGT_PRE_2024[i - 1].maxYears}–`}${b.maxYears} year${b.maxYears === 1 ? "" : "s"}`,
                  value: `Plot ${pct(b.plot)} · House ${pct(b.constructed)} · Flat ${pct(b.flat)}`,
                  muted: true,
                })),
              },
            ]
          : []),
      ],
      warnings,
    };
  },
  methodology: `Capital gains on immovable property are taxed under **section 37(1A)** of the Income Tax Ordinance 2001 as a separate block of income.

**Gain** = sale consideration − cost of acquisition − incidental expenses. If the FBR valuation-table (or DC) value is higher than the declared price, that value is used. For inherited property, Finance Act 2026 fixes the cost at the fair market value on the date of death; family settlements among heirs are treated as transmission, not disposal.

**Property acquired on or after 1 July 2024** (Finance Act 2024): no holding-period relief. Sellers on the Active Taxpayer List pay a flat **15%**. Sellers not on the ATL pay tax at the normal Division I slab rates on the gain, subject to a minimum of 15%.

**Property acquired before 1 July 2024**: the Division VIII table inserted by Finance Act 2022 continues to apply, 
- Open plots: 15% (≤1 yr), 12.5% (1–2), 10% (2–3), 7.5% (3–4), 5% (4–5), 2.5% (5–6), 0% after 6 years.
- Constructed property: 15%, 10%, 7.5%, 5%, then 0% after 4 years.
- Flats: 15% (≤1 yr), 7.5% (1–2), 0% after 2 years.

**Advance tax at transfer (s.236C)**: the registrar or housing society collects ${pct(WHT_236C.filer, 2)} of the sale value from filers and ${pct(WHT_236C.nonFiler)} from non-filers (Finance Act 2026, from 1 July 2026; previously ${WHT_236C.previousFiler}). For filers this is adjustable against the CGT and any excess is refundable through the return. Section 7E deemed-income tax and the 3% FED on property sales no longer apply.`,
  faqs: [
    { question: "Is there capital gains tax if I sell after 6 years?", answer: "Only if you bought the property before 1 July 2024: then open plots are exempt after 6 years, houses after 4 and flats after 2. Property bought from 1 July 2024 onward is taxed at 15% for filers no matter how long you hold it." },
    { question: "How is the holding period counted?", answer: "From the date of acquisition to the date of disposal. For allotted plots FBR generally counts from the allotment/possession letter; for purchased property from the registered transfer. Keep the documents: the rate can swing from 15% to 0%." },
    { question: "Is 236C the same as capital gains tax?", answer: "No. 236C is an advance tax collected at the time of transfer on the full sale price. CGT is calculated on the gain when you file your return. Filers deduct the 236C already paid from their CGT; non-filers effectively lose it unless they file." },
    { question: "What counts as cost of acquisition?", answer: "The purchase price plus stamp duty, registration fees, transfer charges and the cost of documented construction or improvements. Loan interest is not included." },
    { question: "Do I pay CGT on property received as a gift or inheritance?", answer: "Not on receiving it. When you later sell, the cost is the fair market value on the date of death (inheritance, per Finance Act 2026) or the donor's cost (gift), and the holding period usually runs from the original acquisition." },
    { question: "Can I set off a loss on property?", answer: "A capital loss on immovable property can only be set off against capital gains on immovable property: not against salary or business income." },
  ],
  related: { tools: ["property-tax-calculator", "income-tax-calculator", "plot-size-converter"], guides: ["how-to-file-income-tax-return-pakistan", "how-to-check-filer-status-atl-pakistan"], entities: ["fbr"], businessCategories: ["real-estate-agents"] },
};
