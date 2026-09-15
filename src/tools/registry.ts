import { acRunningCostCalculator } from "./calculators/ac-running-cost-calculator";
import { carLoanCalculator } from "./calculators/car-loan-calculator";
import { electricityBillCalculator } from "./calculators/electricity-bill-calculator";
import { fuelCostCalculator } from "./calculators/fuel-cost-calculator";
import { homeLoanCalculator } from "./calculators/home-loan-calculator";
import { incomeTaxCalculator } from "./calculators/income-tax-calculator";
import { plotSizeConverter } from "./calculators/plot-size-converter";
import { ptaMobileTaxCalculator } from "./calculators/pta-mobile-tax-calculator";
import { salaryBreakdownCalculator } from "./calculators/salary-breakdown-calculator";
import { solarPaybackCalculator } from "./calculators/solar-payback-calculator";
import { zakatCalculator } from "./calculators/zakat-calculator";
import { TOOL_CATEGORIES, type ToolCategory, type ToolDefinition } from "./types";

/** Every tool on Searchable. Order here is the default listing order. */
export const TOOLS: ToolDefinition[] = [
  incomeTaxCalculator,
  salaryBreakdownCalculator,
  ptaMobileTaxCalculator,
  electricityBillCalculator,
  zakatCalculator,
  carLoanCalculator,
  solarPaybackCalculator,
  homeLoanCalculator,
  fuelCostCalculator,
  acRunningCostCalculator,
  plotSizeConverter,
];

const bySlug = new Map(TOOLS.map((t) => [t.slug, t]));

export function getTool(slug: string): ToolDefinition | undefined {
  return bySlug.get(slug);
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return TOOLS.filter((t) => t.category === category);
}

export function isToolCategory(value: string): value is ToolCategory {
  return value in TOOL_CATEGORIES;
}

export function toolUrl(tool: Pick<ToolDefinition, "category" | "slug">): string {
  return `/tools/${tool.category}/${tool.slug}`;
}

export { TOOL_CATEGORIES };
