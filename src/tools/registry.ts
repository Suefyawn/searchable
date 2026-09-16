import { acRunningCostCalculator } from "./calculators/ac-running-cost-calculator";
import { ageCalculator } from "./calculators/age-calculator";
import { capitalGainsTaxCalculator } from "./calculators/capital-gains-tax-calculator";
import { carLoanCalculator } from "./calculators/car-loan-calculator";
import { carRegistrationTaxCalculator } from "./calculators/car-registration-tax-calculator";
import { currencyConverter } from "./calculators/currency-converter";
import { electricityBillCalculator } from "./calculators/electricity-bill-calculator";
import { eobiCalculator } from "./calculators/eobi-calculator";
import { fuelCostCalculator } from "./calculators/fuel-cost-calculator";
import { gasBillCalculator } from "./calculators/gas-bill-calculator";
import { homeLoanCalculator } from "./calculators/home-loan-calculator";
import { incomeTaxCalculator } from "./calculators/income-tax-calculator";
import { nationalSavingsCalculator } from "./calculators/national-savings-calculator";
import { personalLoanCalculator } from "./calculators/personal-loan-calculator";
import { plotSizeConverter } from "./calculators/plot-size-converter";
import { providentFundCalculator } from "./calculators/provident-fund-calculator";
import { propertyTaxCalculator } from "./calculators/property-tax-calculator";
import { stampDutyCalculator } from "./calculators/stamp-duty-calculator";
import { ptaMobileTaxCalculator } from "./calculators/pta-mobile-tax-calculator";
import { salaryBreakdownCalculator } from "./calculators/salary-breakdown-calculator";
import { salaryIncrementCalculator } from "./calculators/salary-increment-calculator";
import { salesTaxCalculator } from "./calculators/sales-tax-calculator";
import { solarPaybackCalculator } from "./calculators/solar-payback-calculator";
import { tokenTaxCalculator } from "./calculators/token-tax-calculator";
import { zakatCalculator } from "./calculators/zakat-calculator";
import { freelancerTaxCalculator } from "./calculators/freelancer-tax-calculator";
import { gratuityCalculator } from "./calculators/gratuity-calculator";
import { overtimeCalculator } from "./calculators/overtime-calculator";
import { rentalYieldCalculator } from "./calculators/rental-yield-calculator";
import { mobileLoadTaxCalculator } from "./calculators/mobile-load-tax-calculator";
import { cashWithdrawalTaxCalculator } from "./calculators/cash-withdrawal-tax-calculator";
import { TOOL_CATEGORIES, type ToolCategory, type ToolDefinition } from "./types";

/** Every tool on Searchable. Order here is the default listing order. */
export const TOOLS: ToolDefinition[] = [
  incomeTaxCalculator,
  freelancerTaxCalculator,
  cashWithdrawalTaxCalculator,
  mobileLoadTaxCalculator,
  gratuityCalculator,
  overtimeCalculator,
  rentalYieldCalculator,
  salaryBreakdownCalculator,
  ptaMobileTaxCalculator,
  electricityBillCalculator,
  zakatCalculator,
  carLoanCalculator,
  tokenTaxCalculator,
  solarPaybackCalculator,
  homeLoanCalculator,
  fuelCostCalculator,
  acRunningCostCalculator,
  plotSizeConverter,
  propertyTaxCalculator,
  stampDutyCalculator,
  capitalGainsTaxCalculator,
  currencyConverter,
  carRegistrationTaxCalculator,
  salesTaxCalculator,
  personalLoanCalculator,
  salaryIncrementCalculator,
  eobiCalculator,
  ageCalculator,
  gasBillCalculator,
  nationalSavingsCalculator,
  providentFundCalculator,
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
