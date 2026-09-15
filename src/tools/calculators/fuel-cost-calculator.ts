import { num, str, type ToolDefinition } from "../types";
import { pkr } from "@/lib/format";

const DEFAULT_PETROL = 267.5;
const DEFAULT_DIESEL = 273.4;

export const fuelCostCalculator: ToolDefinition = {
  slug: "fuel-cost-calculator",
  category: "cars",
  name: "Fuel Cost Calculator",
  shortName: "Fuel Cost",
  description: "Monthly and per-kilometre fuel cost from your driving, your car's mileage and today's petrol or diesel price.",
  keywords: ["fuel cost calculator", "petrol cost per km", "monthly fuel expense", "petrol per litre", "car running cost", "diesel cost", "fuel average"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  sources: [{ title: "Fortnightly petroleum prices", url: "https://ogra.org.pk", publisher: "OGRA / Finance Division" }],
  fields: [
    { key: "km", label: "Distance per month", type: "number", unit: "km", default: 1200, min: 0, step: 50, help: "A 20 km daily commute is ~1,000 km a month with weekends." },
    { key: "kmpl", label: "Mileage", type: "number", unit: "km/l", default: 12, min: 1, max: 60, step: 0.5, help: "Alto/Cultus ≈ 15–18, Corolla/City ≈ 11–13, SUV ≈ 7–9 in city driving." },
    { key: "fuel", label: "Fuel", type: "select", options: [{ value: "petrol", label: "Petrol" }, { value: "diesel", label: "Diesel" }], default: "petrol" },
    { key: "price", label: "Price per litre", type: "number", unit: "PKR", default: DEFAULT_PETROL, min: 0, step: 0.5, help: "Defaults to the latest notified price; edit if it changed." },
  ],
  compute(input) {
    const km = num(input, "km");
    const kmpl = Math.max(1, num(input, "kmpl", 12));
    const price = num(input, "price", str(input, "fuel") === "diesel" ? DEFAULT_DIESEL : DEFAULT_PETROL);
    const litres = km / kmpl;
    const monthly = litres * price;
    const perKm = price / kmpl;
    return {
      headline: { label: "Monthly fuel cost", value: pkr(monthly), primary: true },
      summary: `${km.toLocaleString()} km at ${kmpl} km/l uses about ${litres.toFixed(0)} litres — ${pkr(perKm)} per kilometre, ${pkr(monthly * 12)} a year.`,
      sections: [
        {
          title: "Breakdown",
          lines: [
            { label: "Litres per month", value: `${litres.toFixed(1)} l` },
            { label: "Cost per km", value: pkr(perKm) },
            { label: "Cost per 100 km", value: pkr(perKm * 100), muted: true },
            { label: "Annual fuel cost", value: pkr(monthly * 12), primary: true },
          ],
        },
        {
          title: "If mileage improved by 2 km/l",
          lines: [{ label: "You would save per month", value: pkr(monthly - (km / (kmpl + 2)) * price), muted: true }],
        },
      ],
    };
  },
  methodology: `Litres used = distance ÷ mileage. Monthly cost = litres × price per litre. Cost per km = price ÷ mileage.

Real-world mileage is usually 15–25% worse than the manufacturer's figure in Pakistani city traffic with AC on; use the figure from your own fill-ups (km driven between fills ÷ litres filled) for accuracy.`,
  faqs: [
    { question: "How do I measure my car's real mileage?", answer: "Fill the tank, note the odometer, drive normally, fill again and divide the km driven by the litres it took." },
    { question: "Does AC reduce mileage?", answer: "Yes, typically 10–20% in city driving. Highway driving with AC costs less because the engine is already under steady load." },
    { question: "Is diesel cheaper to run?", answer: "Diesel engines are more efficient per litre, but the fuel is now priced slightly above petrol; the advantage is mostly in torque and highway economy." },
  ],
  related: { tools: ["car-loan-calculator"], entities: ["petrol", "ogra"], businessCategories: ["car-workshops"] },
};
