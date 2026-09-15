/**
 * The tools framework. A tool is pure TypeScript: metadata + fields + compute + explain.
 * The generic page at /tools/[category]/[slug] renders any ToolDefinition.
 */

export type ToolCategory = "tax" | "finance" | "cars" | "property" | "utilities" | "government" | "solar" | "telecom";

export const TOOL_CATEGORIES: Record<ToolCategory, { name: string; description: string }> = {
  tax: { name: "Tax", description: "Income tax, PTA tax, withholding, filer vs non-filer" },
  finance: { name: "Finance", description: "Salary, zakat, loans, savings, remittances" },
  cars: { name: "Cars", description: "Financing, registration, token tax, fuel cost" },
  property: { name: "Property", description: "Stamp duty, CVT, rental yield, plot size" },
  utilities: { name: "Utilities", description: "Electricity, gas, water bills" },
  government: { name: "Government", description: "Fees, timelines, eligibility" },
  solar: { name: "Solar", description: "System sizing, payback, net metering" },
  telecom: { name: "Telecom", description: "Packages, PTA, mobile tax" },
};

export type FieldOption = { value: string; label: string };

export type Field =
  | { key: string; label: string; type: "number"; help?: string; placeholder?: string; min?: number; max?: number; step?: number; unit?: string; default?: number }
  | { key: string; label: string; type: "select"; help?: string; options: FieldOption[]; default?: string }
  | { key: string; label: string; type: "boolean"; help?: string; default?: boolean };

export type ToolInput = Record<string, number | string | boolean>;

export type ResultLine = {
  label: string;
  value: string;
  /** Visually emphasised, the headline number. */
  primary?: boolean;
  /** Sub-detail, rendered smaller. */
  muted?: boolean;
  note?: string;
};

export type ResultSection = { title?: string; lines: ResultLine[] };

export type ToolResult = {
  headline: ResultLine;
  sections: ResultSection[];
  /** Plain-language summary shown under the headline. */
  summary?: string;
  warnings?: string[];
};

export type Source = { title: string; url?: string; publisher?: string; date?: string };
export type Faq = { question: string; answer: string };

export interface ToolDefinition {
  slug: string;
  category: ToolCategory;
  name: string;
  shortName?: string;
  /** Title tag / social card title, keyword-led. Falls back to name. */
  seoTitle?: string;
  description: string;
  keywords: string[];
  version: string;
  /** ISO date the numbers were last checked against the source. */
  lastReviewed: string;
  sources: Source[];
  fields: Field[];
  compute(input: ToolInput): ToolResult;
  /** Markdown explaining exactly how the number is produced. */
  methodology: string;
  faqs: Faq[];
  related?: { tools?: string[]; guides?: string[]; entities?: string[]; businessCategories?: string[] };
  /** A topic hub page this tool belongs to (e.g. /pta). */
  hubUrl?: string;
  featured?: boolean;
}

/** Utility: read a numeric field with a default. */
export function num(input: ToolInput, key: string, fallback = 0): number {
  const v = input[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

export function str(input: ToolInput, key: string, fallback = ""): string {
  const v = input[key];
  return typeof v === "string" ? v : fallback;
}

export function bool(input: ToolInput, key: string, fallback = false): boolean {
  const v = input[key];
  return typeof v === "boolean" ? v : fallback;
}
