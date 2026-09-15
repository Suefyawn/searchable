import { SALES_TAX } from "../data/vehicle-tax";
import { bool, num, str, type ToolDefinition } from "../types";
import { pct, pkr } from "@/lib/format";

export const salesTaxCalculator: ToolDefinition = {
  slug: "sales-tax-calculator",
  category: "tax",
  name: "Sales Tax Calculator Pakistan (GST 18% & Services Tax)",
  seoTitle: "Sales Tax Calculator Pakistan 2026: 18% GST on Goods, Punjab / Sindh / KP Services Tax, Inclusive & Exclusive",
  shortName: "Sales tax",
  description: "Add or back out sales tax: 18% federal GST on goods, provincial services tax (PRA 16%, SRB 15%, KPRA 15%) and the 4% further tax on sales to unregistered buyers. Works from tax-inclusive or exclusive amounts.",
  keywords: ["sales tax calculator pakistan", "gst calculator pakistan", "18 percent sales tax calculator", "punjab sales tax on services", "sindh sales tax on services", "srb tax rate", "pra tax rate", "sales tax inclusive exclusive calculator", "further tax unregistered", "how to calculate sales tax pakistan"],
  version: "1.0.0",
  lastReviewed: SALES_TAX.reviewedAt,
  sources: [SALES_TAX.source],
  fields: [
    { key: "amount", label: "Amount", type: "number", unit: "PKR", default: 100_000, min: 0, step: 100 },
    {
      key: "kind",
      label: "What is being sold",
      type: "select",
      options: [
        { value: "goods", label: "Goods: federal sales tax 18%" },
        { value: "punjab", label: "Services in Punjab: PRA 16%" },
        { value: "sindh", label: "Services in Sindh: SRB 15%" },
        { value: "kp", label: "Services in KP: KPRA 15%" },
        { value: "balochistan", label: "Services in Balochistan: BRA 15%" },
        { value: "ict", label: "Services in Islamabad: 15%" },
      ],
      default: "goods",
    },
    {
      key: "mode",
      label: "The amount is",
      type: "select",
      options: [
        { value: "exclusive", label: "Before tax (add tax)" },
        { value: "inclusive", label: "Tax-inclusive (find the tax inside it)" },
      ],
      default: "exclusive",
    },
    { key: "unregistered", label: "Buyer is not sales-tax registered (goods only)", type: "boolean", default: false, help: "Registered sellers charge 4% further tax on supplies to unregistered persons (s.3(1A))." },
  ],
  compute(input) {
    const amount = Math.max(0, num(input, "amount"));
    const kind = str(input, "kind", "goods");
    const inclusive = str(input, "mode", "exclusive") === "inclusive";
    const isGoods = kind === "goods";
    const svc = SALES_TAX.services[kind as keyof typeof SALES_TAX.services];
    const base = isGoods ? SALES_TAX.goods : (svc?.rate ?? SALES_TAX.goods);
    const further = isGoods && bool(input, "unregistered") ? SALES_TAX.furtherTaxUnregistered : 0;
    const rate = base + further;
    const net = inclusive ? amount / (1 + rate) : amount;
    const tax = net * rate;
    const gross = net + tax;
    const label = isGoods ? "Federal sales tax (FBR)" : `${svc?.name ?? "Provincial"} sales tax on services`;
    return {
      headline: { label: inclusive ? "Sales tax inside the amount" : "Sales tax to add", value: pkr(tax), primary: true },
      summary: inclusive ? `${pkr(amount)} includes ${pkr(tax)} of tax at ${pct(rate)}; the price before tax is ${pkr(net)}.` : `${pkr(amount)} plus ${pct(rate)} tax is ${pkr(gross)}, ${pkr(tax)} of tax.`,
      sections: [
        {
          title: "Breakdown",
          lines: [
            { label: "Price before tax", value: pkr(net) },
            { label: `${label}: ${pct(base)}`, value: pkr(net * base) },
            ...(further ? [{ label: `Further tax on unregistered buyer: ${pct(further)}`, value: pkr(net * further) }] : []),
            { label: "Total with tax", value: pkr(gross), primary: true },
            { label: "Effective rate", value: pct(rate), muted: true },
          ],
        },
      ],
      warnings: isGoods ? ["Some goods carry reduced or higher rates (e.g. petroleum, pharmaceuticals, retail POS items) and some are exempt under the Sixth Schedule, check the Sales Tax Act schedules for your item."] : ["Reduced service rates apply to some categories (e.g. restaurants paying via card, IT services); check the authority's schedule."],
    };
  },
  methodology: `**Goods** are taxed by FBR under the Sales Tax Act 1990 at the standard rate of **18%** (s.3). A registered seller supplying to an **unregistered** buyer adds **further tax of 4%** (s.3(1A)). Reduced rates, fixed rates and exemptions exist for specific goods in the Third, Sixth and Eighth Schedules.

**Services** are a provincial subject since the 18th Amendment. Each authority sets its own standard rate: Punjab Revenue Authority 16%; Sindh Revenue Board, KP Revenue Authority and Balochistan Revenue Authority 15%; Islamabad Capital Territory 15% (collected by FBR). Many services have reduced rates (with input tax disallowed), telecom, restaurants and IT are common exceptions.

**Inclusive vs exclusive:** for a tax-inclusive amount, price before tax = amount ÷ (1 + rate); tax = amount − that.`,
  faqs: [
    { question: "How do I calculate 18% sales tax?", answer: "Multiply the pre-tax price by 0.18 and add it. To find the tax inside a tax-inclusive price, divide by 1.18 to get the base price and subtract." },
    { question: "Which rate applies to services in Karachi?", answer: "Sindh Revenue Board's 15% standard rate. Punjab (PRA) charges 16%. The rate follows where the service is provided or received under each authority's rules." },
    { question: "What is further tax?", answer: "An extra 4% a registered seller must charge when selling taxable goods to someone who is not sales-tax registered. Getting registered removes it and lets the buyer claim input tax." },
    { question: "Is sales tax charged on top of income tax withholding?", answer: "Yes: they are separate. Withholding income tax on purchases (s.153) is deducted by the buyer from the payment; sales tax is added to the invoice." },
  ],
  related: { tools: ["income-tax-calculator", "property-tax-calculator"], guides: ["how-to-register-a-company-with-secp", "fbr-iris-login-registration-and-filing-guide"], entities: ["fbr"], businessCategories: ["tax-consultants"] },
};
