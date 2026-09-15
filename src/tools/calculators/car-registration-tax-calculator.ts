import { REGISTRATION_FEE_PUNJAB, registrationFeePunjab, WHT_231B, wht231B } from "../data/vehicle-tax";
import { num, str, type ToolDefinition } from "../types";
import { pct, pkr } from "@/lib/format";

export const carRegistrationTaxCalculator: ToolDefinition = {
  slug: "car-registration-tax-calculator",
  category: "cars",
  name: "Car Registration Tax Calculator 2026-27 (231B)",
  seoTitle: "Car Registration Tax Calculator Pakistan 2026-27 — 231B Withholding Tax on New Cars, Filer vs Non-Filer, On-Road Price",
  shortName: "Registration tax",
  description: "See what a new car really costs on the road: section 231B advance tax by engine size (filer vs non-filer), Punjab registration fee and number plate, so you know the total before you book.",
  keywords: ["car registration tax", "231b tax", "tax on car registration pakistan", "advance tax on vehicle registration", "on road price calculator pakistan", "filer non filer car tax", "new car registration charges punjab", "withholding tax on cars", "vehicle registration fee punjab"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  featured: true,
  sources: [WHT_231B.source, REGISTRATION_FEE_PUNJAB.source],
  fields: [
    { key: "value", label: "Invoice price (incl. duties & taxes)", type: "number", unit: "PKR", default: 4_500_000, min: 100_000, step: 50_000, help: "Ex-factory price on the invoice. For imports: customs value + duty + FED + sales tax." },
    { key: "cc", label: "Engine capacity", type: "number", unit: "cc", default: 1300, min: 50, max: 8000, step: 10 },
    {
      key: "filer",
      label: "Buyer's FBR status",
      type: "select",
      options: [
        { value: "filer", label: "Filer (on Active Taxpayer List)" },
        { value: "nonfiler", label: "Non-filer" },
      ],
      default: "filer",
      help: "Non-filers pay three times the 231B rate.",
    },
    { key: "regFee", label: "Include Punjab registration fee & plate", type: "boolean", default: true, help: "1% up to 1000cc, 2% to 2000cc, 4% above, plus ≈ Rs 4,500 for plate and smart card. Other provinces differ slightly." },
  ],
  compute(input) {
    const value = Math.max(0, num(input, "value"));
    const cc = Math.max(0, num(input, "cc", 1300));
    const filer = str(input, "filer", "filer") !== "nonfiler";
    const includeReg = input.regFee !== false;
    const w = wht231B(cc, value, filer);
    const other = wht231B(cc, value, !filer);
    const reg = includeReg ? registrationFeePunjab(cc, value) : 0;
    const plate = includeReg ? REGISTRATION_FEE_PUNJAB.plateAndCard : 0;
    const total = value + w.amount + reg + plate;
    return {
      headline: { label: `On-road cost (${filer ? "filer" : "non-filer"})`, value: pkr(total), primary: true },
      summary: `A ${cc.toLocaleString()}cc car invoiced at ${pkr(value)} attracts ${pct(w.pct, 2)} = ${pkr(w.amount)} advance income tax under s.231B as a ${filer ? "filer" : "non-filer"}${includeReg ? `, plus ${pkr(reg + plate)} Punjab registration fee and plate` : ""}. ${filer ? `A non-filer would pay ${pkr(other.amount)} in 231B alone.` : `Getting on the ATL first would cut 231B to ${pkr(other.amount)} — a saving of ${pkr(w.amount - other.amount)}.`}`,
      sections: [
        {
          title: "Breakdown",
          lines: [
            { label: "Invoice price", value: pkr(value) },
            { label: `s.231B advance tax — ${pct(w.pct, 2)} (${filer ? "filer" : "non-filer"})`, value: pkr(w.amount), note: "Adjustable against your income tax for the year if you file." },
            ...(includeReg ? [{ label: `Registration fee (Punjab)`, value: pkr(reg) }, { label: "Number plate, smart card, processing", value: pkr(plate) }] : []),
            { label: "Total on the road", value: pkr(total), primary: true },
          ],
        },
        {
          title: "Filer vs non-filer (231B only)",
          lines: [
            { label: "As filer", value: pkr(filer ? w.amount : other.amount) },
            { label: "As non-filer", value: pkr(filer ? other.amount : w.amount) },
            { label: "Difference", value: pkr(Math.abs(w.amount - other.amount)), muted: true },
          ],
        },
      ],
      warnings: [
        "Annual token tax and the lifetime token for ≤1000cc cars are separate — see the Token Tax Calculator.",
        "Registration fee shown is the Punjab schedule; Sindh, KP and Islamabad use their own percentages. Dealer 'own' premium is not included.",
      ],
    };
  },
  methodology: `**Section 231B** of the Income Tax Ordinance requires the Excise office to collect advance income tax when a new vehicle is registered. Since Finance Act 2025 it is a **percentage of the vehicle's value** rather than a fixed amount per engine band, and Finance Act 2026 left the schedule unchanged:

| Engine | Filer | Non-filer |
|---|---|---|
| up to 850cc | 0.5% | 1.5% |
| 851–1000cc | 1% | 3% |
| 1001–1300cc | 1.5% | 4.5% |
| 1301–1600cc | 2% | 6% |
| 1601–1800cc | 3% | 9% |
| 1801–2000cc | 5% | 15% |
| 2001–2500cc | 7% | 21% |
| 2501–3000cc | 9% | 27% |
| above 3000cc | 12% | 36% |

Value is the invoice price including duties and taxes for locally assembled cars, or customs value plus duty, FED and sales tax for imports. The tax is **adjustable** — filers set it off against their income tax when they file — which is why the filer/non-filer gap is the single biggest saving in buying a car.

**Registration fee** is provincial. Punjab charges 1% of value up to 1000cc, 2% to 2000cc and 4% above, plus number plate and smart-card charges. Token tax is charged separately and annually (or once, for ≤1000cc).`,
  faqs: [
    { question: "Is 231B refundable?", answer: "It is an advance tax. Filers adjust it against the income tax due on their return; if it exceeds the tax due the balance is refundable. Non-filers cannot adjust it unless they file for that year." },
    { question: "Does 231B apply to used cars?", answer: "Transfers of ownership attract a fixed amount by engine band, reduced by 10% for each year since first registration and nil after five years. This calculator covers new registrations." },
    { question: "What about electric cars?", answer: "EVs are banded by motor power (kW) rather than cc under the same section, and several provinces reduce registration and token tax for EVs. Ask the Excise office for the current EV band before booking." },
    { question: "Can the dealer include these in the price?", answer: "Dealers often quote an on-road figure that bundles 231B, registration and plate — ask for the breakdown and check the 231B line against this calculator; some quote the non-filer rate to everyone." },
  ],
  related: { tools: ["token-tax-calculator", "car-loan-calculator", "income-tax-calculator"], guides: ["how-to-register-a-vehicle-in-punjab", "how-to-check-filer-status-atl-pakistan"], entities: ["fbr", "toyota", "suzuki", "honda"], businessCategories: ["car-dealers"] },
};
