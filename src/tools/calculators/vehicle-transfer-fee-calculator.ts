import { VEHICLE_TRANSFER_PUNJAB } from "../data/fees";
import { bool, num, str, type ToolDefinition } from "../types";
import { pct, pkr } from "@/lib/format";

const FEES = VEHICLE_TRANSFER_PUNJAB.fee;
type VehicleKey = keyof typeof FEES;

export const vehicleTransferFeeCalculator: ToolDefinition = {
  slug: "vehicle-transfer-fee-calculator",
  category: "cars",
  name: "Vehicle Transfer Fee Calculator Punjab",
  seoTitle: "Vehicle Transfer Fee in Punjab 2026: Car & Bike Ownership Transfer Cost, Smart Card and CVT",
  shortName: "Transfer fee",
  description: "What it costs to transfer a car or motorcycle to your name in Punjab: the Excise transfer fee by engine size, the smart card and the 1% capital value tax, in one total.",
  keywords: ["vehicle transfer fee", "car transfer fee punjab", "bike transfer fee", "vehicle ownership transfer fee", "excise transfer fee", "car transfer cost pakistan", "motorcycle transfer fee lahore", "cvt on vehicle transfer", "smart card fee excise"],
  version: "1.0.0",
  lastReviewed: VEHICLE_TRANSFER_PUNJAB.reviewedAt,
  sources: [VEHICLE_TRANSFER_PUNJAB.source],
  fields: [
    { key: "vehicle", label: "Vehicle", type: "select", options: (Object.keys(FEES) as VehicleKey[]).map((k) => ({ value: k, label: FEES[k].label })), default: "upTo1000" },
    { key: "value", label: "Assessed value of the vehicle", type: "number", unit: "PKR", default: 2_500_000, min: 0, step: 50_000, help: "Excise assesses value from the invoice price less depreciation for each year since first registration." },
    { key: "smartCard", label: "Include the smart registration card", type: "boolean", default: true },
  ],
  compute(input) {
    const key = (str(input, "vehicle", "upTo1000") in FEES ? str(input, "vehicle", "upTo1000") : "upTo1000") as VehicleKey;
    const fee = FEES[key].amount;
    const card = bool(input, "smartCard", true) ? VEHICLE_TRANSFER_PUNJAB.smartCard : 0;
    const value = Math.max(0, num(input, "value"));
    const cvt = Math.round(value * VEHICLE_TRANSFER_PUNJAB.cvtRate);
    const total = fee + card + cvt;
    return {
      headline: { label: "Total transfer cost", value: pkr(total), primary: true },
      summary: `Transferring a ${FEES[key].label.toLowerCase()} in Punjab costs ${pkr(fee)} in transfer fee${card ? `, ${pkr(card)} for the smart card` : ""} and ${pkr(cvt)} capital value tax on a ${pkr(value)} assessed value: ${pkr(total)} in all.`,
      sections: [
        {
          title: "Breakdown",
          lines: [
            { label: `Transfer fee (${FEES[key].label})`, value: pkr(fee) },
            ...(card ? [{ label: "Smart registration card", value: pkr(card) }] : []),
            { label: `Capital value tax (${pct(VEHICLE_TRANSFER_PUNJAB.cvtRate)} of assessed value)`, value: pkr(cvt) },
            { label: "Total payable to Excise", value: pkr(total), primary: true },
          ],
        },
        {
          title: "Transfer fee by vehicle",
          lines: (Object.keys(FEES) as VehicleKey[]).map((k) => ({ label: FEES[k].label, value: pkr(FEES[k].amount), muted: k !== key })),
        },
      ],
      warnings: [
        "Punjab only. Sindh, KP, Balochistan and Islamabad have their own schedules.",
        "Any unpaid token tax and the withholding tax under section 231B (non-filers pay more) are collected at the same time and are not included here. Bank and e-Pay service charges are extra.",
      ],
    };
  },
  methodology: `Punjab's Excise, Taxation & Narcotics Control Department publishes a flat **transfer fee** by vehicle class: Rs 910 for a motorcycle, Rs 4,540 for a car up to 1000cc, Rs 9,075 from 1001cc to 1800cc (and for heavy transport vehicles) and Rs 18,150 above 1800cc.

Every transfer issues a new **data-embedded smart card** (Rs 1,300). Since 1 July 2022 the Punjab Finance Act also charges **capital value tax at 1%** of the vehicle's assessed value on transfer; Excise values the vehicle from its invoice price less annual depreciation.

Total = transfer fee + smart card + CVT. Pay through e-Pay Punjab or at the Excise office with the seller's original registration book, both CNICs, the transfer deed and the sale receipt.`,
  faqs: [
    { question: "How much is the car transfer fee in Lahore?", answer: "The Punjab schedule applies across the province: Rs 4,540 for a car up to 1000cc, Rs 9,075 up to 1800cc and Rs 18,150 above 1800cc, plus Rs 1,300 for the smart card and 1% capital value tax." },
    { question: "What is the bike transfer fee?", answer: "Rs 910 plus Rs 1,300 for the smart card, plus 1% CVT on the assessed value (Rs 1,500 on a Rs 150,000 motorcycle)." },
    { question: "Do I pay token tax when transferring?", answer: "Any arrears of token tax are cleared at transfer. Vehicles transferred within ten years of registration may also owe the lifetime token balance; Excise shows it on the challan." },
    { question: "Can the transfer be done online?", answer: "The fee can be paid through e-Pay Punjab, but the transfer itself needs the buyer's biometric verification and the documents at an Excise office or facilitation centre." },
  ],
  related: { tools: ["token-tax-calculator", "car-registration-tax-calculator", "car-loan-calculator"], guides: ["how-to-register-a-vehicle-in-punjab"], entities: [] },
};
