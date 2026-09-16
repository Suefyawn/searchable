import { PROVINCES, REVIEWED_AT } from "../data/property-tax";
import { bool, num, str, type ToolDefinition } from "../types";
import { pct, pkr } from "@/lib/format";

type Prov = keyof typeof PROVINCES;

/**
 * The provincial charges on a property transfer (stamp duty, registration fee, the local transfer levy), by
 * province, on the value the registrar uses. The federal advance taxes (236K, 236C) are in the property tax
 * calculator; this one answers "what is the stamp duty on a Rs X plot in Lahore" on its own.
 */
export const stampDutyCalculator: ToolDefinition = {
  slug: "stamp-duty-calculator",
  category: "property",
  name: "Stamp Duty Calculator: Punjab, Sindh, Islamabad (2026)",
  seoTitle: "Stamp Duty Calculator Pakistan 2026: Punjab 1%, Sindh, Islamabad, Registration Fee and Transfer Tax",
  shortName: "Stamp duty",
  description: "Stamp duty, registration fee and the local transfer levy on a property sale in Punjab, Sindh or Islamabad, on the DC or FBR value the registrar applies. Punjab's 1% uniform rate from the April 2026 ordinance, with the gazette as the source.",
  keywords: ["stamp duty calculator", "stamp duty calculator punjab", "stamp duty on property in pakistan", "stamp duty lahore", "stamp duty karachi", "stamp duty islamabad", "property registration fee punjab", "e-stamp punjab calculator", "property transfer charges pakistan", "registry fee calculator"],
  version: "1.0.0",
  lastReviewed: REVIEWED_AT,
  sources: [
    { title: "The Punjab Gazette, 10 April 2026: The Stamp (Amendment) Ordinance 2026 (VI of 2026), uniform 1% stamp duty on conveyance in urban and rural areas", url: "https://punjabcode.punjab.gov.pk/uploads/articles/stamp-amendment-ordinance-2026-pdf.pdf", publisher: "Government of the Punjab, Law and Parliamentary Affairs Department" },
    ...PROVINCES.sindh.sources,
    ...PROVINCES.islamabad.sources,
  ],
  fields: [
    { key: "value", label: "Value used for registration", type: "number", unit: "PKR", default: 10_000_000, min: 0, step: 100_000, help: "The registrar charges on the DC (district collector) table value or the FBR valuation, whichever is higher, not on what you actually paid." },
    { key: "province", label: "Where the property is", type: "select", options: (Object.keys(PROVINCES) as Prov[]).map((p) => ({ value: p, label: PROVINCES[p].name })), default: "punjab" },
    { key: "local", label: "Include the local transfer levy", type: "boolean", default: true, help: "Punjab TMA tax; the CDA transfer fee in Islamabad's CDA sectors. Housing societies (DHA, Bahria) charge their own transfer fees instead, on top." },
  ],
  compute(input) {
    const value = Math.max(0, num(input, "value"));
    const prov = PROVINCES[str(input, "province", "punjab") as Prov] ?? PROVINCES.punjab;
    const withLocal = bool(input, "local");
    const stamp = value * prov.stampDuty;
    const reg = value * prov.registrationFee;
    const local = withLocal ? value * prov.localTax : 0;
    const total = stamp + reg + local;
    return {
      headline: { label: `Stamp duty in ${prov.name}`, value: pkr(stamp), primary: true },
      summary: `On a registered value of ${pkr(value)} in ${prov.name}: stamp duty ${pkr(stamp)} at ${pct(prov.stampDuty)}, registration fee ${pkr(reg)}${local ? `, ${prov.localTaxLabel.toLowerCase()} ${pkr(local)}` : ""}: ${pkr(total)} to the province before the federal advance tax.`,
      sections: [
        {
          title: "Provincial charges at registration",
          lines: [
            { label: `Stamp duty: ${pct(prov.stampDuty)}`, value: pkr(stamp), primary: true },
            { label: `Registration fee: ${pct(prov.registrationFee)}`, value: pkr(reg) },
            ...(prov.localTax ? [{ label: `${prov.localTaxLabel}: ${pct(prov.localTax)}`, value: withLocal ? pkr(local) : "not included" }] : []),
            { label: "Total provincial charges", value: pkr(total), primary: true },
            { label: "As a share of value", value: pct(total / (value || 1)), muted: true },
          ],
        },
        {
          title: "Not in this figure",
          lines: [
            { label: "Federal advance tax on the buyer (s.236K)", value: "property tax calculator" },
            { label: "Federal advance tax on the seller (s.236C)", value: "property tax calculator" },
            { label: "Society or authority transfer fee (DHA, Bahria, LDA, KDA)", value: "society schedule" },
            { label: "Stamp paper for the sale agreement, deed writing, witness costs", value: "a few thousand rupees" },
          ],
        },
      ],
      warnings: [prov.verified, "Stamp duty is paid on an e-Stamp (Punjab, Sindh and Islamabad all issue them online through a bank challan) before the deed is presented; the sub-registrar will not register a deed on an under-stamped paper."],
    };
  },
  methodology: `**Stamp duty** is a provincial tax on the instrument of transfer (the conveyance or sale deed), charged as a percentage of the value the registering authority accepts: the district collector's valuation table or, where higher, the FBR valuation. Since the 18th Amendment each province sets its own rate in Schedule I of its Stamp Act.

**Punjab**: the Stamp (Amendment) Ordinance 2026, published in the Punjab Gazette of 10 April 2026, substituted "One" for "Three" per cent in Articles 18, 23, 27-A, 33, 55 and 63 of Schedule I, so conveyances in rural areas now carry the same **1%** as urban areas. It also created the "assignable deed" (Article 11-AA) at 1% within twelve months of the last transfer and 2% beyond it. Registration fee (1%) and the TMA transfer tax (1%) are charged alongside.

**Sindh** charges stamp duty of 2% and a registration fee of 1% on the schedule figures in use; **Islamabad** charges 1% stamp duty since the Finance Act 2025, 1% registration fee, and CDA's 1% transfer fee in CDA sectors since April 2026.

The federal government's advance taxes under sections 236K (buyer) and 236C (seller) are collected at the same counter but are income tax, adjustable against the year's liability for filers; they are in the [property tax calculator](/tools/property/property-tax-calculator).`,
  faqs: [
    { question: "What is the stamp duty on property in Punjab in 2026?", answer: "1% of the registered value, in both urban and rural areas, under the Stamp (Amendment) Ordinance 2026 of 10 April 2026 (rural transfers were 3% before). Registration fee of 1% and TMA tax of 1% are paid with it." },
    { question: "Is stamp duty charged on the price I paid or the DC value?", answer: "On the value the registrar applies: the district collector's valuation table, or the FBR valuation where that is higher. If your price is above both, some sub-registrars charge on the declared price; ask before you buy the e-stamp." },
    { question: "How do I pay stamp duty in Punjab?", answer: "Through e-Stamping: generate a challan on the Board of Revenue's e-Stamp portal or through a bank, pay at the bank, and the e-stamp paper is printed against the deed. Paper stamps are no longer accepted for these values." },
    { question: "Who pays, buyer or seller?", answer: "By custom and under the Stamp Act the buyer pays stamp duty and registration fee; the seller pays the advance tax under section 236C and any society no-demand-certificate charges. Parties can agree otherwise in the sale agreement." },
    { question: "Does a gift deed or inheritance pay the same?", answer: "No. Gift (hiba) deeds within the family and inheritance mutations carry nominal or reduced stamp duty under separate articles of the schedule; check the province's schedule for the current figure." },
  ],
  related: { tools: ["property-tax-calculator", "capital-gains-tax-calculator", "plot-size-converter"], guides: ["online-vehicle-verification-in-pakistan-punjab-sindh-islamabad-and-kp-registrati"], entities: ["fbr"], businessCategories: ["real-estate-agents", "lawyers"] },
};
