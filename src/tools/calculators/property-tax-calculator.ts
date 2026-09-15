import { FEDERAL_SOURCES, PROVINCES, REVIEWED_AT, WHT_236C, WHT_236K, wht236C, wht236K } from "../data/property-tax";
import { bool, num, str, type ResultLine, type ToolDefinition } from "../types";
import { pct, pkr } from "@/lib/format";

type ProvinceKey = keyof typeof PROVINCES;

function provinceOf(v: string): ProvinceKey {
  return v in PROVINCES ? (v as ProvinceKey) : "punjab";
}

export const propertyTaxCalculator: ToolDefinition = {
  slug: "property-tax-calculator",
  category: "property",
  name: "Property Tax Calculator Pakistan 2026-27",
  seoTitle: "Property Tax Calculator Pakistan 2026-27 — Tax on Buying & Selling Property (236K, 236C, Stamp Duty)",
  shortName: "Property Tax",
  description: "Calculate every tax on a property purchase or sale in Pakistan for 2026-27: FBR advance tax under 236K (buyer) and 236C (seller) for filers and non-filers, plus stamp duty, registration fee and transfer tax in Punjab, Sindh and Islamabad.",
  keywords: ["property tax calculator pakistan", "property tax in pakistan", "tax on property purchase pakistan", "236k tax", "236c tax", "advance tax on property", "stamp duty on property pakistan", "property transfer tax pakistan", "property registration charges", "fbr property tax 2026", "withholding tax on property filer non filer"],
  version: "1.0.0",
  lastReviewed: REVIEWED_AT,
  featured: true,
  sources: [...FEDERAL_SOURCES, ...PROVINCES.punjab.sources, ...PROVINCES.islamabad.sources, ...PROVINCES.sindh.sources],
  fields: [
    {
      key: "side",
      label: "I am",
      type: "select",
      options: [
        { value: "buy", label: "Buying" },
        { value: "sell", label: "Selling" },
      ],
      default: "buy",
    },
    {
      key: "province",
      label: "Property is in",
      type: "select",
      options: [
        { value: "punjab", label: "Punjab" },
        { value: "sindh", label: "Sindh" },
        { value: "islamabad", label: "Islamabad (ICT)" },
      ],
      default: "punjab",
      help: "KP and Balochistan are not included yet.",
    },
    { key: "value", label: "Property value", type: "number", unit: "PKR", default: 15_000_000, min: 0, step: 100_000, help: "FBR taxes the higher of the declared price and the FBR valuation-table value; provincial duties use the DC rate. Enter the value the registrar will use." },
    {
      key: "filer",
      label: "My FBR status",
      type: "select",
      options: [
        { value: "filer", label: "Filer (on Active Taxpayer List)" },
        { value: "nonfiler", label: "Non-filer" },
      ],
      default: "filer",
      help: "The 'late filer' rate was abolished by Finance Act 2026 — you are either on the ATL or you are not.",
    },
    { key: "custom", label: "Enter my own provincial rates", type: "boolean", default: false, help: "Stamp duty and fees vary by district and society. Turn this on to override the province defaults below." },
    { key: "stamp", label: "Stamp duty", type: "number", unit: "%", default: 1, min: 0, max: 10, step: 0.25 },
    { key: "reg", label: "Registration fee", type: "number", unit: "%", default: 1, min: 0, max: 10, step: 0.25 },
    { key: "local", label: "Local / authority transfer tax", type: "number", unit: "%", default: 1, min: 0, max: 10, step: 0.25, help: "TMA tax in Punjab, CDA transfer fee in Islamabad, society/DHA/KDA transfer fee elsewhere." },
  ],
  compute(input) {
    const side = str(input, "side", "buy") === "sell" ? "sell" : "buy";
    const province = PROVINCES[provinceOf(str(input, "province", "punjab"))];
    const value = Math.max(0, num(input, "value"));
    const filer = str(input, "filer", "filer") !== "nonfiler";
    const custom = bool(input, "custom");
    const stamp = custom ? num(input, "stamp", 0) / 100 : province.stampDuty;
    const reg = custom ? num(input, "reg", 0) / 100 : province.registrationFee;
    const local = custom ? num(input, "local", 0) / 100 : province.localTax;
    const warnings: string[] = [province.verified];

    if (side === "sell") {
      const rate = wht236C(filer);
      const tax = Math.round(value * rate);
      const other = Math.round(value * wht236C(!filer));
      return {
        headline: { label: `Advance tax on sale (s.236C, ${filer ? "filer" : "non-filer"})`, value: pkr(tax), primary: true },
        summary: `Selling for ${pkr(value)} as a ${filer ? "filer" : "non-filer"}, the registrar withholds ${pct(rate, 2)} = ${pkr(tax)} under section 236C. ${filer ? "This is adjustable against your capital gains tax when you file." : `As a filer you would pay ${pkr(other)} — and could adjust it against CGT.`} Stamp duty and registration are normally paid by the buyer.`,
        sections: [
          {
            title: "Seller pays",
            lines: [
              { label: `s.236C advance tax — ${pct(rate, 2)} of ${pkr(value)}`, value: pkr(tax), primary: true },
              { label: "Capital gains tax", value: "See CGT calculator", note: "15% of the gain for filers on property bought after 1 July 2024; holding-period table for older property. 236C is deducted from it." },
            ],
          },
          {
            title: "Filer vs non-filer",
            lines: [
              { label: `As filer (${pct(WHT_236C.filer, 2)})`, value: pkr(Math.round(value * WHT_236C.filer)) },
              { label: `As non-filer (${pct(WHT_236C.nonFiler)})`, value: pkr(Math.round(value * WHT_236C.nonFiler)) },
              { label: "Saved by being on the ATL before the sale", value: pkr(Math.round(value * (WHT_236C.nonFiler - WHT_236C.filer))), muted: true },
            ],
          },
        ],
        warnings: ["Section 7E deemed-income tax and the 3% FED on property sales no longer apply (Finance Acts 2025 and 2026)."],
      };
    }

    const rate = wht236K(value, filer);
    const fed = Math.round(value * rate);
    const stampAmt = Math.round(value * stamp);
    const regAmt = Math.round(value * reg);
    const localAmt = Math.round(value * local);
    const provincial = stampAmt + regAmt + localAmt;
    const total = fed + provincial;
    const filerTotal = Math.round(value * wht236K(value, true)) + provincial;
    const nonFilerTotal = Math.round(value * wht236K(value, false)) + provincial;
    const lines: ResultLine[] = [
      { label: `s.236K advance tax (federal) — ${pct(rate, 2)} of ${pkr(value)}`, value: pkr(fed), note: filer ? "Adjustable against your income tax for the year." : "Non-filer rate; effectively a sunk cost unless you file and claim it." },
      { label: `Stamp duty — ${pct(stamp, 2)}`, value: pkr(stampAmt) },
      { label: `Registration fee — ${pct(reg, 2)}`, value: pkr(regAmt) },
      ...(local ? [{ label: `${province.localTaxLabel} — ${pct(local, 2)}`, value: pkr(localAmt) }] : []),
      { label: "Total taxes and duties", value: pkr(total), primary: true },
      { label: "Effective cost of taxes on the price", value: pct(value ? total / value : 0, 2), muted: true },
    ];
    if (!filer) warnings.unshift(`Getting on the Active Taxpayer List before registration would cut the federal tax from ${pkr(fed)} to ${pkr(Math.round(value * WHT_236K.filer))}.`);

    return {
      headline: { label: `Total tax on buying (${province.name}, ${filer ? "filer" : "non-filer"})`, value: pkr(total), primary: true },
      summary: `On a ${pkr(value)} purchase in ${province.name} you pay ${pkr(fed)} federal advance tax (s.236K at ${pct(rate, 2)}) plus ${pkr(provincial)} in provincial stamp duty, registration and transfer charges — ${pct(value ? total / value : 0, 2)} on top of the price.`,
      sections: [
        { title: "Buyer pays", lines },
        {
          title: "Filer vs non-filer",
          lines: [
            { label: "Total as filer", value: pkr(filerTotal) },
            { label: "Total as non-filer", value: pkr(nonFilerTotal) },
            { label: "Difference", value: pkr(nonFilerTotal - filerTotal), muted: true },
          ],
        },
      ],
      warnings,
    };
  },
  methodology: `Two layers of tax apply when property changes hands in Pakistan.

**Federal (FBR) — Income Tax Ordinance 2001, as amended by Finance Act 2026, from 1 July 2026:**
- **Buyer, s.236K:** ${pct(WHT_236K.filer, 2)} of the fair market value for anyone on the Active Taxpayer List (a flat rate replacing last year's ${WHT_236K.previousFiler}). Non-filers pay ${pct(WHT_236K.nonFiler[0].rate)} up to Rs 50 million, ${pct(WHT_236K.nonFiler[1].rate)} to Rs 100 million and ${pct(WHT_236K.nonFiler[2].rate)} above. The "late filer" middle rate was abolished.
- **Seller, s.236C:** ${pct(WHT_236C.filer, 2)} of the consideration for filers (was ${WHT_236C.previousFiler}); ${pct(WHT_236C.nonFiler)} for non-filers. Adjustable against capital gains tax.
- Fair market value = the higher of the declared price and the FBR valuation table for the area.
- The s.7E deemed-income tax (0.2% of value above Rs 25 million) was omitted by Finance Act 2026 after the Federal Constitutional Court struck it down; the 3% FED on sales went in Finance Act 2025.

**Provincial — Stamp Act schedule, Registration Act and local-government levies, charged on the DC rate:**
- **Punjab:** stamp duty 1% (uniform for urban and rural since the Stamp (Amendment) Ordinance of 10 April 2026), registration fee 1%, TMA transfer tax 1%.
- **Islamabad (ICT):** conveyance stamp duty 1% (Finance Act 2025, down from 4%), registration fee 1%, CDA transfer fee 1% in CDA sectors (down from 3% on 10 April 2026).
- **Sindh:** stamp duty 2% and registration fee 1% as commonly quoted; confirm at the sub-registrar. Society and DHA transfer fees are separate.

Provincial figures are defaults — districts cap some fees and housing societies add their own charges — so the tool lets you type the rates your registrar quotes.`,
  faqs: [
    { question: "Who pays 236K and who pays 236C?", answer: "The buyer pays 236K at purchase; the seller pays 236C at sale. Both are collected by the registrar or housing society before the transfer is recorded and deposited with FBR against your CNIC." },
    { question: "Is 236K refundable?", answer: "For filers it is an advance tax: it is adjusted against your income tax for the year and any excess is refundable through your return. Non-filers pay a far higher rate and cannot adjust it unless they file." },
    { question: "What value is the tax charged on?", answer: "FBR taxes the higher of the price you declare and the FBR valuation-table value for that area. Provincial stamp duty and registration use the DC (District Collector) rate. In most cities the FBR value is now close to market." },
    { question: "How much tax do I pay when buying a house in Lahore?", answer: "As a filer in 2026-27: 1.25% federal 236K plus roughly 3% Punjab charges (1% stamp duty, 1% registration, 1% TMA) — about 4.25% of the value. A non-filer pays 10.5% federal on the same house up to Rs 50 million, so 13.5% in total." },
    { question: "Does the property tax include annual property tax (UIPT)?", answer: "No. This tool covers the one-off taxes on a transfer. Annual urban immovable property tax is a separate provincial levy assessed by Excise & Taxation on the property's rental or capital value." },
    { question: "Is there still a 7E tax on property?", answer: "No. Section 7E (tax on deemed rental income of properties worth over Rs 25 million) was omitted by Finance Act 2026 following the Federal Constitutional Court's judgment, so no 7E certificate is needed for a transfer from 1 July 2026." },
  ],
  related: { tools: ["capital-gains-tax-calculator", "home-loan-calculator", "plot-size-converter", "income-tax-calculator"], guides: ["how-to-check-filer-status-atl-pakistan", "how-to-become-a-tax-filer-in-pakistan"], entities: ["fbr"], businessCategories: ["real-estate-agents", "tax-consultants"] },
};
