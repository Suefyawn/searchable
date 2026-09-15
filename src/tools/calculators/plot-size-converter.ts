import { num, str, type ToolDefinition } from "../types";
import { number } from "@/lib/format";

/**
 * Pakistan uses two marla standards: 272.25 sq ft (Punjab, KP, Islamabad — the "big marla",
 * 1 marla = 9 sq karam of 5.5 ft) and 225 sq ft (Karachi/Sindh and many DHA phases — 15 ft × 15 ft).
 */
const MARLA_SQFT = { punjab: 272.25, karachi: 225 };
const SQFT_PER_SQM = 10.7639;
const SQYD_SQFT = 9;

export const plotSizeConverter: ToolDefinition = {
  slug: "plot-size-converter",
  category: "property",
  name: "Marla to Square Feet Converter",
  seoTitle: "Marla to Square Feet Converter — 1 Kanal in Marla, 5 Marla in Sq Ft, Sq Yards to Marla",
  shortName: "Plot Size",
  description: "Convert marla, kanal, square feet, square yards (gaz) and square metres instantly — 1 kanal = 20 marla; 5 marla = 1,125 or 1,361 sq ft depending on the standard.",
  keywords: ["marla to square feet", "1 kanal in marla", "5 marla in square feet", "10 marla in square feet", "1 marla in square feet", "kanal to square feet", "square yards to marla", "marla to sq ft converter", "plot size converter", "gaz to marla"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  sources: [{ title: "Board of Revenue Punjab — land measurement units", publisher: "Government of Punjab" }, { title: "Karachi Development Authority plot standards", publisher: "KDA" }],
  fields: [
    { key: "value", label: "Size", type: "number", default: 5, min: 0, step: 0.5 },
    {
      key: "unit",
      label: "Unit",
      type: "select",
      options: [
        { value: "marla", label: "Marla" },
        { value: "kanal", label: "Kanal (20 marla)" },
        { value: "acre", label: "Acre (8 kanal)" },
        { value: "sqft", label: "Square feet" },
        { value: "sqyd", label: "Square yards (gaz)" },
        { value: "sqm", label: "Square metres" },
      ],
      default: "marla",
    },
    {
      key: "standard",
      label: "Marla standard",
      type: "select",
      options: [
        { value: "punjab", label: "Punjab / KP / Islamabad — 272.25 sq ft" },
        { value: "karachi", label: "Karachi / Sindh (and most DHAs) — 225 sq ft" },
      ],
      default: "punjab",
    },
  ],
  compute(input) {
    const value = num(input, "value");
    const unit = str(input, "unit", "marla");
    const std = str(input, "standard", "punjab") === "karachi" ? "karachi" : "punjab";
    const marlaSqft = MARLA_SQFT[std];
    const toSqft: Record<string, number> = { marla: marlaSqft, kanal: marlaSqft * 20, acre: marlaSqft * 160, sqft: 1, sqyd: SQYD_SQFT, sqm: SQFT_PER_SQM };
    const sqft = value * (toSqft[unit] ?? 1);
    const marla = sqft / marlaSqft;
    const f = (n: number, d = 2) => number(n, d);
    return {
      headline: { label: `${f(value)} ${unit === "sqft" ? "sq ft" : unit === "sqyd" ? "sq yd" : unit === "sqm" ? "sq m" : unit} is`, value: `${f(sqft, 0)} sq ft`, primary: true },
      summary: `Using the ${std === "punjab" ? "272.25" : "225"} sq ft marla: ${f(marla)} marla = ${f(marla / 20, 3)} kanal = ${f(sqft / SQYD_SQFT)} sq yards.`,
      sections: [
        {
          title: "Equivalents",
          lines: [
            { label: "Marla", value: f(marla) },
            { label: "Kanal", value: f(marla / 20, 3) },
            { label: "Acre", value: f(marla / 160, 4), muted: true },
            { label: "Square feet", value: f(sqft, 0), primary: true },
            { label: "Square yards (gaz)", value: f(sqft / SQYD_SQFT) },
            { label: "Square metres", value: f(sqft / SQFT_PER_SQM) },
          ],
        },
        {
          title: "Same plot on the other standard",
          lines: [{ label: std === "punjab" ? "Marla at 225 sq ft" : "Marla at 272.25 sq ft", value: f(sqft / (std === "punjab" ? MARLA_SQFT.karachi : MARLA_SQFT.punjab)), muted: true }],
        },
      ],
      warnings: ["Always confirm the standard used in the society's own documents — a '5 marla' plot can be 1,125 or 1,361 sq ft."],
    };
  },
  methodology: `1 kanal = 20 marla; 1 acre = 8 kanal = 160 marla. The size of a marla differs by region:

- **Punjab, KP, Islamabad (traditional):** 1 marla = 272.25 sq ft (a 16.5 ft × 16.5 ft square).
- **Karachi, Sindh, and most DHA / private societies nationwide:** 1 marla = 225 sq ft (15 ft × 15 ft).

1 sq yard (gaz) = 9 sq ft; 1 sq m = 10.764 sq ft. All conversions go through square feet.`,
  faqs: [
    { question: "How many square feet in 5 marla?", answer: "1,361 sq ft on the Punjab standard, or 1,125 sq ft on the 225 sq ft standard used in Karachi and most DHAs." },
    { question: "How many marla in a kanal?", answer: "20 marla. A kanal is 5,445 sq ft (Punjab) or 4,500 sq ft (225 sq ft marla)." },
    { question: "What is a 120 sq yard plot in marla?", answer: "120 sq yards = 1,080 sq ft = 4.8 marla at 225 sq ft, or about 4 marla at 272.25 sq ft." },
  ],
  related: { tools: [], guides: [], businessCategories: ["real-estate-agents"] },
};
