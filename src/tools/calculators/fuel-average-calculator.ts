import { FUEL } from "../data/rates";
import { num, str, type ToolDefinition } from "../types";
import { number, pkr } from "@/lib/format";

export const fuelAverageCalculator: ToolDefinition = {
  slug: "fuel-average-calculator",
  category: "cars",
  name: "Fuel Average Calculator (km per litre)",
  seoTitle: "Fuel Average Calculator: Car & Bike Mileage in km/l, Cost per km and Monthly Petrol Cost",
  shortName: "Fuel average",
  description: "Find your car or bike's real fuel average in kilometres per litre from a tank fill, then the petrol cost per kilometre and per month at today's price.",
  keywords: ["fuel average calculator", "mileage calculator", "km per litre calculator", "car average calculator", "bike average calculator", "petrol average calculator", "fuel consumption calculator", "cost per km calculator", "how to calculate fuel average", "average of car"],
  version: "1.0.0",
  lastReviewed: FUEL.reviewedAt,
  sources: [FUEL.source],
  fields: [
    { key: "km", label: "Distance driven since the last full tank", type: "number", unit: "km", default: 400, min: 1, step: 10, help: "Fill the tank, note the odometer, drive, fill again, and take the difference." },
    { key: "litres", label: "Litres to fill the tank again", type: "number", unit: "L", default: 30, min: 0.1, step: 0.5 },
    { key: "fuel", label: "Fuel", type: "select", options: [{ value: "petrol", label: "Petrol" }, { value: "diesel", label: "Diesel" }], default: "petrol" },
    { key: "price", label: "Price per litre", type: "number", unit: "PKR", default: FUEL.petrolPerLitre, min: 0, step: 0.5, help: "Defaults to the latest notified price." },
    { key: "monthlyKm", label: "Kilometres you drive a month", type: "number", unit: "km", default: 1000, min: 0, step: 50 },
  ],
  compute(input) {
    const km = Math.max(0, num(input, "km", 400));
    const litres = Math.max(0, num(input, "litres", 30));
    const price = Math.max(0, num(input, "price", str(input, "fuel") === "diesel" ? FUEL.dieselPerLitre : FUEL.petrolPerLitre));
    const monthlyKm = Math.max(0, num(input, "monthlyKm", 1000));
    const kmpl = litres > 0 ? km / litres : 0;
    const l100 = kmpl > 0 ? 100 / kmpl : 0;
    const perKm = kmpl > 0 ? price / kmpl : 0;
    const monthly = perKm * monthlyKm;
    const band = kmpl >= 18 ? "excellent for a car, typical of a 660cc or hybrid" : kmpl >= 13 ? "normal for a 1000cc to 1300cc car in mixed driving" : kmpl >= 9 ? "on the thirsty side: heavy traffic, AC on, or a 1600cc and above engine" : kmpl > 0 ? "very low: check tyre pressure, air filter, and whether the odometer reading is right" : "";
    return {
      headline: { label: "Fuel average", value: kmpl ? `${number(kmpl, 1)} km/l` : "-", primary: true },
      summary: kmpl ? `${km} km on ${number(litres, 1)} litres is ${number(kmpl, 1)} km per litre (${number(l100, 1)} litres per 100 km), ${band}. At ${pkr(price)} a litre that is ${pkr(perKm)} per km, about ${pkr(monthly)} for ${number(monthlyKm)} km a month.` : "Enter the distance and the litres it took.",
      sections: [
        {
          title: "Consumption",
          lines: [
            { label: "Kilometres per litre", value: number(kmpl, 2), primary: true },
            { label: "Litres per 100 km", value: number(l100, 2), muted: true },
            { label: "Range on a 35-litre tank", value: `${number(kmpl * 35)} km`, muted: true },
          ],
        },
        {
          title: "Cost",
          lines: [
            { label: "Cost per kilometre", value: pkr(perKm) },
            { label: `Monthly fuel (${number(monthlyKm)} km)`, value: pkr(monthly), primary: true },
            { label: "Yearly fuel", value: pkr(monthly * 12), muted: true },
          ],
        },
      ],
      warnings: ["One tank gives a rough figure; average three or four fills for a reliable number. City driving with the AC on can cut the average by a quarter compared with the highway."],
    };
  },
  methodology: `The **tank-to-tank method** is the only honest way to measure mileage: fill the tank to the first click, reset the trip meter or note the odometer, drive normally, fill to the first click again, and divide the kilometres by the litres the second fill took.

*Average (km/l) = kilometres driven / litres refilled.*
*Cost per km = price per litre / km per litre.*

Litres per 100 km, the unit used on spec sheets abroad, is 100 divided by the km/l figure. The default price is the latest notified petrol price from OGRA (diesel when you select it).`,
  faqs: [
    { question: "What is a good fuel average for a car in Pakistan?", answer: "660cc cars and hybrids return 18 to 24 km/l, 1000cc to 1300cc cars 12 to 16 km/l in mixed driving, and 1600cc and larger cars 8 to 12 km/l. Motorcycles do 35 to 60 km/l." },
    { question: "How do I calculate my bike's average?", answer: "Fill the tank, note the odometer, ride until you refuel, fill it again and divide the kilometres covered by the litres it took. A CD 70 doing 300 km on 6 litres has a 50 km/l average." },
    { question: "Why is my average lower than the company claims?", answer: "Claimed figures come from test cycles. Traffic, short trips, the air conditioner, roof racks, under-inflated tyres and a dirty air filter all raise real consumption." },
    { question: "How do I convert km/l to litres per 100 km?", answer: "Divide 100 by the km/l figure. 12.5 km/l is 8 litres per 100 km." },
  ],
  related: { tools: ["fuel-cost-calculator", "car-loan-calculator", "token-tax-calculator"], entities: ["ogra"] },
};
