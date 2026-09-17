# Tools Framework

A tool is one TypeScript file. The generic page renders it, the search index lists it, the seed mirrors its metadata. Rates live in data files, never inline.

## Anatomy

```
src/tools/
  types.ts                 ToolDefinition, Field, ToolResult, TOOL_CATEGORIES, helpers num()/str()/bool()
  registry.ts              TOOLS[], the only place a tool is registered
  data/
    income-tax.ts          Slab tables per tax year + computeIncomeTax()
    rates.ts               PTA slabs, electricity tariff, zakat nisab, labour, reference market rates
  calculators/
    income-tax-calculator.ts
    …
src/components/tools/tool-runner.tsx   generic client renderer (form → compute → results)
src/app/tools/[category]/[slug]/page.tsx  generic server page (SEO, methodology, FAQs, sources, related)
```

## Adding a tool

1. **Create** `src/tools/calculators/<slug>.ts`:

```ts
import { num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

export const fuelCostCalculator: ToolDefinition = {
  slug: "fuel-cost-calculator",
  category: "cars",
  name: "Fuel Cost Calculator",
  shortName: "Fuel Cost",
  description: "Monthly fuel cost from your commute, mileage and today's petrol price.",
  keywords: ["fuel cost", "petrol cost per km", "monthly fuel expense"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  sources: [{ title: "OGRA fortnightly price", url: "https://ogra.org.pk", publisher: "OGRA" }],
  fields: [
    { key: "km", label: "Kilometres per month", type: "number", unit: "km", default: 1200, min: 0, step: 50 },
    { key: "kmpl", label: "Mileage", type: "number", unit: "km/l", default: 12, min: 1, step: 0.5 },
    { key: "price", label: "Petrol price", type: "number", unit: "PKR/l", default: 267.5, min: 0, step: 0.5 },
  ],
  compute(input) {
    const litres = num(input, "km") / num(input, "kmpl", 12);
    const cost = litres * num(input, "price");
    return {
      headline: { label: "Monthly fuel cost", value: pkr(cost), primary: true },
      summary: `${litres.toFixed(0)} litres a month at ${pkr(num(input, "price"))} per litre.`,
      sections: [{ title: "Breakdown", lines: [{ label: "Litres", value: litres.toFixed(1) }, { label: "Per km", value: pkr(cost / Math.max(1, num(input, "km"))) }] }],
    };
  },
  methodology: `Litres = km ÷ km/l. Cost = litres × price.`,
  faqs: [{ question: "Which price should I use?", answer: "The current OGRA-notified petrol price; Searchable updates the default fortnightly." }],
  related: { tools: ["car-loan-calculator"], entities: ["petrol", "ogra"] },
};
```

2. **Register** it in `src/tools/registry.ts` (`TOOLS` array, order = listing order).
3. **Rates** go in `src/tools/data/*.ts` with `reviewedAt`/`effectiveFrom` and a `source`.
4. Run `npm run db:seed` (or `search:reindex`) with the dev server stopped to mirror metadata into `tools` and the search index.
5. Visit `/tools/<category>/<slug>`.

## Rules
- `compute()` must be **pure and synchronous**, it runs in the browser on every keystroke.
- Never `throw` for bad input; clamp or return a warning in `warnings[]`.
- Money formatting via `pkr()`, percentages via `pct()` (`src/lib/format.ts`).
- Put the most useful figure in `headline`. Keep `sections` to what a person needs to trust the number.
- `warnings` are for scope limits ("does not include withholding for non-filers"), always state what is excluded.
- `methodology` is Markdown, written for a smart non-expert.
- `faqs` become `FAQPage` JSON-LD, write real questions people search.
- Bump `version` and `lastReviewed` whenever a rate table changes.

## Field types
| type | props |
|---|---|
| `number` | `unit`, `min`, `max`, `step`, `default`, `placeholder`, `help` |
| `select` | `options: {value,label}[]`, `default` |
| `boolean` | `default`, `help` |

## Shareable results
Every field value is serialised to the query string by "Share this result"; the page rehydrates from `?key=value`. Canonical stays the bare URL.

## Usage logging
After ~4s on the page, one anonymous `tool_runs` row is written with the current inputs and `tools.run_count` is incremented. Nothing personal is stored.

## First 50 tools (Phase 3 backlog)
**Tax (10):** income tax ✅ · salary take-home ✅ · withholding on property purchase · withholding on vehicle registration · capital gains on property · rental income tax · advance tax on cash withdrawal · sales tax on services (provincial) · filer vs non-filer comparison · tax refund estimator
**Finance (10):** zakat ✅ · car loan ✅ · home loan (KIBOR) · personal loan · savings/PLS returns · Naya Pakistan Certificate returns · remittance cost comparison · inflation adjuster · FD vs savings · credit card cost
**Cars (10):** fuel cost ✅ · token tax by province ✅ · registration cost ✅ · import duty on used car (parked: rates unverifiable) · resale value · EMI compare (bank vs dealer) · CNG vs petrol · km per litre ✅ · insurance premium · transfer fee ✅ (Punjab)
**Property (5):** stamp duty & CVT · rental yield · plot size converter (marla/kanal/sqft) · construction cost · property tax
**Utilities (5):** electricity ✅ · gas bill (slab) ✅ · water charges · UPS/battery sizing ✅ · AC running cost ✅ · electricity units by appliance ✅
**Government (5):** passport fee & timeline ✅ · CNIC fee · driving licence fee · NADRA FRC · birth certificate (NADRA fees wait for the official schedule; nadra.gov.pk blocks fetches)
**Solar (5):** payback ✅ · system sizing ✅ (panel count, inverter, roof area) · net-metering savings · battery backup hours ✅ · panel count for roof area ✅
**Finance, added:** gold converter (tola, gram, masha, ratti, value by karat at the live rate) ✅
**Education (new category):** CGPA / GPA on the HEC 4.0 scale ✅
