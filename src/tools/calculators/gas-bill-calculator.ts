import { GAS_TARIFF } from "../data/gas-savings";
import { num, str, type ToolDefinition } from "../types";
import { number, pkr } from "@/lib/format";

export const gasBillCalculator: ToolDefinition = {
  slug: "gas-bill-calculator",
  category: "utilities",
  name: "Sui Gas Bill Calculator (SNGPL & SSGC)",
  seoTitle: "Sui Gas Bill Calculator 2026 — SNGPL & SSGC Domestic Slabs, Protected vs Non-Protected, Fixed Charges & GST",
  shortName: "Gas bill",
  description: "Estimate your monthly Sui gas bill from meter units (m³) or hm³ using the OGRA domestic slabs for SNGPL and SSGC — protected and non-protected rates, fixed charges, meter rent and 18% GST.",
  keywords: ["sui gas bill calculator", "sngpl bill calculator", "ssgc bill calculator", "gas bill calculator pakistan", "sui gas slab rates 2026", "protected consumer gas", "non protected gas bill", "gas tariff pakistan", "hm3 to mmbtu", "sngpl bill check"],
  version: "1.0.0",
  lastReviewed: GAS_TARIFF.reviewedAt,
  featured: true,
  sources: [GAS_TARIFF.source],
  fields: [
    { key: "units", label: "Gas consumed this month", type: "number", unit: "m³", default: 60, min: 0, max: 2000, step: 1, help: "Current reading minus previous reading on the meter, in cubic metres. 1 hm³ = 100 m³." },
    {
      key: "status",
      label: "Consumer category",
      type: "select",
      options: [
        { value: "protected", label: "Protected (under 0.9 hm³ in each of the last 4 months)" },
        { value: "nonprotected", label: "Non-protected" },
      ],
      default: "protected",
      help: "Your bill says which. Protected status is lost after one month above 0.9 hm³ (90 m³) and regained after four months below it.",
    },
    { key: "gcv", label: "Gas calorific factor", type: "number", unit: "MMBTU per m³", default: GAS_TARIFF.mmbtuPerM3, min: 0.03, max: 0.045, step: 0.0005, help: "Printed on the bill as GCV / conversion factor; 0.0355 is typical." },
  ],
  compute(input) {
    const m3 = Math.max(0, num(input, "units"));
    const hm3 = m3 / 100;
    const protectedC = str(input, "status", "protected") === "protected";
    const factor = num(input, "gcv", GAS_TARIFF.mmbtuPerM3);
    const mmbtu = m3 * factor;
    const table = protectedC ? GAS_TARIFF.protected.slabs : GAS_TARIFF.nonProtected.slabs;
    const slab = table.find((s) => s.maxHm3 === null || hm3 <= s.maxHm3) ?? table[table.length - 1];
    const beyondProtected = protectedC && hm3 > 0.9;
    const effectiveTable = beyondProtected ? GAS_TARIFF.nonProtected.slabs : table;
    const effSlab = beyondProtected ? effectiveTable.find((s) => s.maxHm3 === null || hm3 <= s.maxHm3)! : slab;
    const gasCharge = mmbtu * effSlab.rate;
    const fixed = protectedC && !beyondProtected ? GAS_TARIFF.protected.fixedCharge : hm3 <= 1.5 ? GAS_TARIFF.nonProtected.fixedChargeLow : GAS_TARIFF.nonProtected.fixedChargeHigh;
    const subtotal = gasCharge + fixed + GAS_TARIFF.meterRent;
    const gst = subtotal * GAS_TARIFF.gst;
    const total = subtotal + gst;
    const warnings: string[] = ["Estimate. Actual bills use the exact GCV for your area, may include arrears or adjustments, and apply the previous-slab protection rule at slab boundaries."];
    if (beyondProtected) warnings.unshift("Above 0.9 hm³ this month you are billed at non-protected rates and will lose protected status for the next four months.");
    return {
      headline: { label: "Estimated gas bill", value: pkr(total), primary: true },
      summary: `${number(m3, 0)} m³ (${number(hm3, 2)} hm³ ≈ ${number(mmbtu, 2)} MMBTU) at the ${beyondProtected ? "non-protected" : protectedC ? "protected" : "non-protected"} rate of Rs ${number(effSlab.rate, 0)}/MMBTU comes to ${pkr(gasCharge)}, plus ${pkr(fixed)} fixed charge and ${pkr(GAS_TARIFF.meterRent)} meter rent; with 18% GST the bill is about ${pkr(total)}.`,
      sections: [
        {
          title: "Breakdown",
          lines: [
            { label: `Gas charge — ${number(mmbtu, 2)} MMBTU × Rs ${number(effSlab.rate, 0)}`, value: pkr(gasCharge) },
            { label: "Fixed charge", value: pkr(fixed) },
            { label: "Meter rent", value: pkr(GAS_TARIFF.meterRent) },
            { label: "GST 18%", value: pkr(gst) },
            { label: "Total", value: pkr(total), primary: true },
            { label: "Cost per m³ (all-in)", value: m3 ? pkr(total / m3) : "—", muted: true },
          ],
        },
        {
          title: "Slab table",
          lines: effectiveTable.map((s, i) => ({ label: `${i === 0 ? "0" : effectiveTable[i - 1].maxHm3} – ${s.maxHm3 ?? "∞"} hm³`, value: `Rs ${number(s.rate, 0)} / MMBTU${s === effSlab ? " ← you" : ""}`, muted: true })),
        },
      ],
      warnings,
    };
  },
  methodology: `OGRA sets domestic gas prices per **MMBTU** in consumption slabs of **hm³** (100 m³) per month. Your meter reads m³; the bill converts to MMBTU with the gas calorific value (about 0.0355 MMBTU per m³) and charges the **whole consumption at the slab it falls in** — so one extra unit at a boundary can raise the rate on every unit (a "previous-slab protection" rule limits the jump).

**Protected consumers** (under 0.9 hm³ in each of the last four months) pay Rs 200–350/MMBTU with a Rs 600 fixed charge. **Non-protected** consumers pay Rs 500–4,200/MMBTU with a fixed charge of Rs 1,500 (≤ 1.5 hm³) or Rs 3,000. Meter rent is Rs 40 and GST 18% applies to the total. These prices took effect 1 July 2025 and were left unchanged in the July 2026 review.`,
  faqs: [
    { question: "What is a protected gas consumer?", answer: "A domestic connection that used less than 0.9 hm³ (90 m³) in each of the previous four months. It is billed at much lower slab rates and a Rs 600 fixed charge. One month above 0.9 hm³ moves you to non-protected for the next four." },
    { question: "Why did my gas bill double in winter?", answer: "Heaters and geysers push consumption into higher slabs, and because the whole month's gas is billed at that slab's rate, the per-unit price jumps too — plus the fixed charge rises above 1.5 hm³." },
    { question: "How do I convert m³ to MMBTU?", answer: "Multiply by the GCV factor on your bill (about 0.0355). 100 m³ ≈ 3.55 MMBTU." },
    { question: "Is this the same for SNGPL and SSGC?", answer: "Yes — OGRA notifies one domestic tariff for both; only the calorific factor differs slightly by region." },
  ],
  related: { tools: ["electricity-bill-calculator", "ac-running-cost-calculator"], guides: [], entities: ["ogra"], businessCategories: ["plumbers"] },
};
