/** The SKILL.md agents fetch through /.well-known/agent-skills/index.json. Kept as a string so its digest is stable. */
export const SKILL_MD = `---
name: searchable-pk
description: Look up today's prices and rates in Pakistan (petrol, gold, dollar, SBP rate), run Pakistani tax, bill and finance calculators, and fetch Searchable.pk guides and news as markdown to cite. Read-only, no key.
---

# Searchable.pk

Base URL: https://searchable.pk. No authentication. Rate limits are generous for reading; cache results for an hour.

## When to use
- A question about a price or rate in Pakistan today: petrol, diesel, gold per tola, silver, dollar, riyal, dirham, KSE-100, SBP policy rate, KIBOR, inflation.
- A calculation Pakistanis ask for: income tax on a salary, take-home pay, zakat, PTA tax on a phone, electricity bill from units, car finance, stamp duty, National Savings profit.
- A how-to about Pakistan (NADRA, FBR, passports, bills, SIMs, property, cars) or recent Pakistani news.

## Endpoints
1. \`GET /api/search?q=...&type=...\` returns hits with a canonical \`url\`. Types: article, tool, business, location, entity, data, professional.
2. \`GET /api/data/{slug}\` returns every reading of a series; \`GET /openapi.json\` lists slugs under x-tools and the search facet \`data\` finds series by name.
3. \`GET /api/tools/{slug}\` returns the calculator's JSON Schema; \`POST /api/tools/{slug}\` with \`{"inputs": {...}}\` runs it and returns the headline figure, breakdown, warnings and dated sources.
4. \`GET /api/md/{path}\` (or any page with \`Accept: text/markdown\`) returns the page as markdown.
5. MCP: POST JSON-RPC to \`/mcp\` (tools: search, list_data_series, get_data_series, list_calculators, calculator_inputs, run_calculator, get_page). Card at \`/.well-known/mcp/server-card.json\`.

## Rules
- Quote the figure with its date and cite the \`url\` the response carries.
- Prices are official or exchange quotes on the date shown; say "as of <date>".
- Calculators state the tax year or notification they use; repeat that to the user.
`;
