import { NADRA_FEES, type NadraDocument, type NadraService } from "../data/fees";
import { REFERENCE_RATES } from "../data/rates";
import { bool, num, str, type ToolDefinition } from "../types";
import { number, pkr } from "@/lib/format";

const DOCS = NADRA_FEES.documents;
const PRIORITIES = ["normal", "urgent", "executive"] as const;
const PRIORITY_LABEL = { normal: "Normal", urgent: "Urgent", executive: "Executive" };
const SERVICE_LABEL: Record<NadraService, string> = { new: "New (first issue)", modification: "Modification (name, address, marital status)", duplicate: "Duplicate (lost or damaged)", renewal: "Renewal (expired)" };

export const nadraFeeCalculator: ToolDefinition = {
  slug: "nadra-fee-calculator",
  category: "government",
  name: "NADRA Fee Calculator: CNIC, Smart Card, FRC, CRC, NICOP, POC",
  seoTitle: "NADRA Fees 2026: CNIC, Smart NIC, FRC, CRC (B-Form), NICOP and POC Fee with Normal, Urgent and Executive Delivery Times",
  shortName: "NADRA fee",
  description: "NADRA's official fee and delivery time for every identity document: new, renewal, modification or duplicate CNIC and Smart NIC, FRC, CRC (B-form), NICOP by zone and POC, in normal, urgent and executive categories.",
  keywords: ["nadra fee", "frc nadra", "frc fee", "cnic fee", "smart card fee", "cnic renewal fee", "nadra fee structure", "nicop fee", "poc fee", "b form fee", "crc nadra", "nadra urgent fee", "nadra executive fee", "cnic modification fee", "duplicate cnic fee"],
  version: "1.0.0",
  lastReviewed: NADRA_FEES.reviewedAt,
  featured: true,
  sources: [NADRA_FEES.source],
  fields: [
    { key: "doc", label: "Document", type: "select", options: (Object.keys(DOCS) as NadraDocument[]).map((k) => ({ value: k, label: DOCS[k].label })), default: "smartNic" },
    { key: "service", label: "Service", type: "select", options: (Object.keys(SERVICE_LABEL) as NadraService[]).map((k) => ({ value: k, label: SERVICE_LABEL[k] })), default: "renewal" },
    { key: "priority", label: "Priority", type: "select", options: PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] })), default: "normal" },
    { key: "delivery", label: "Add home delivery within Pakistan", type: "boolean", default: false },
    { key: "usdPkr", label: "USD to PKR rate (for NICOP and POC)", type: "number", unit: "PKR", default: REFERENCE_RATES.usdPkr, min: 1, step: 0.5, help: "NADRA converts dollar fees at the official rate on the application date." },
  ],
  compute(input) {
    const docKey = (str(input, "doc", "smartNic") in DOCS ? str(input, "doc", "smartNic") : "smartNic") as NadraDocument;
    const doc = DOCS[docKey];
    const requested = str(input, "service", "renewal") as NadraService;
    const service = (doc.services[requested] ? requested : (Object.keys(doc.services)[0] as NadraService)) satisfies NadraService;
    const fees = doc.services[service]!;
    const wanted = PRIORITIES.indexOf(str(input, "priority", "normal") as (typeof PRIORITIES)[number]);
    const idx = fees[wanted] !== null ? wanted : fees.findIndex((f) => f !== null);
    const fee = fees[idx] ?? 0;
    const days = doc.days[idx];
    const usd = doc.currency === "USD";
    const rate = Math.max(1, num(input, "usdPkr", REFERENCE_RATES.usdPkr));
    const inPkr = usd ? fee * rate : fee;
    const delivery = !usd && bool(input, "delivery") ? NADRA_FEES.deliveryPk : 0;
    const total = inPkr + delivery;
    const money = (v: number | null) => (v === null ? "Not offered" : usd ? `USD ${number(v)} (about ${pkr(v * rate)})` : pkr(v));
    return {
      headline: { label: `${doc.label}: ${SERVICE_LABEL[service].split(" (")[0].toLowerCase()}, ${PRIORITY_LABEL[PRIORITIES[idx]].toLowerCase()}`, value: usd ? `USD ${number(fee)}` : pkr(total), primary: true },
      summary: `${doc.label}, ${SERVICE_LABEL[service].toLowerCase()}, in the ${PRIORITY_LABEL[PRIORITIES[idx]].toLowerCase()} category costs ${money(fee)}${delivery ? ` plus ${pkr(delivery)} home delivery` : ""}. NADRA quotes ${days ?? "-"} day${days === 1 ? "" : "s"} from fee payment.${idx !== wanted ? ` The ${PRIORITY_LABEL[PRIORITIES[wanted]].toLowerCase()} category is not offered for this document, so the nearest one is shown.` : ""}`,
      sections: [
        {
          title: "Every priority for this service",
          lines: PRIORITIES.map((p, i) => ({ label: `${PRIORITY_LABEL[p]}${doc.days[i] ? ` (${doc.days[i]} day${doc.days[i] === 1 ? "" : "s"})` : ""}`, value: money(fees[i]), primary: i === idx })),
        },
        {
          title: "Other services for this document",
          lines: (Object.keys(doc.services) as NadraService[]).filter((s) => s !== service).map((s) => ({ label: SERVICE_LABEL[s], value: PRIORITIES.map((p, i) => `${PRIORITY_LABEL[p][0]} ${doc.services[s]![i] === null ? "-" : usd ? `$${doc.services[s]![i]}` : number(doc.services[s]![i]!)}`).join(" · "), muted: true })),
        },
        ...(delivery || usd
          ? [
              {
                title: "Total",
                lines: [
                  ...(usd ? [{ label: `Converted at Rs ${number(rate, 2)} per dollar`, value: pkr(inPkr), muted: true }] : []),
                  ...(delivery ? [{ label: "Home delivery within Pakistan", value: pkr(delivery) }, { label: "Total", value: pkr(total), primary: true }] : []),
                ],
              },
            ]
          : []),
      ],
      warnings: [
        "Timelines start after the fee is paid. Fees paid abroad or through the Pak-ID app are charged in rupees at the official conversion rate on the day.",
        "Not included: age changes (Rs 1,000 to 10,000 by the size of the correction), duplicate-identity clearance and succession certificates, all on NADRA's schedule.",
      ],
    };
  },
  methodology: `NADRA publishes one fee schedule for its identity documents, by document, service and **priority**: normal, urgent and executive, each with its own processing time counted from fee payment.

Inland documents are priced in rupees: a paper **CNIC** is free for a first issue and Rs 400 for renewal, modification or duplicate in the normal category (Rs 1,150 urgent, Rs 2,150 executive); the **Smart NIC** is Rs 750, 1,500 or 2,500 for every service; the **CRC** (B-form) is Rs 50 normal or Rs 500 executive; an **FRC** is executive only, Rs 1,000 for one family type or Rs 2,000 for both. Cancellation on death is free.

**NICOP** and **POC** are priced in US dollars by zone (Zone A: USA and Europe; Zone B: Middle East and Africa) and paid in rupees at NADRA's conversion rate on the application date. Home delivery within Pakistan is Rs 165.`,
  faqs: [
    { question: "What is the FRC fee at NADRA?", answer: "Rs 1,000 for a family registration certificate of one family type (alpha, beta or gamma) and Rs 2,000 for both, executive category only, delivered in one day. The certificate can be applied for on the Pak-ID app or at any NRC." },
    { question: "How much does CNIC renewal cost?", answer: "Rs 400 for a paper CNIC (15 days) or Rs 750 for a Smart NIC (31 days) in the normal category. Urgent is Rs 1,150 or Rs 1,500 and executive Rs 2,150 or Rs 2,500." },
    { question: "Is a first CNIC free?", answer: "Yes. A new paper CNIC in the normal category has no fee and takes about 15 days. A new Smart NIC costs Rs 750." },
    { question: "What is the B-form fee?", answer: "The child registration certificate (CRC) costs Rs 50 in the normal category (7 days) or Rs 500 executive (1 day)." },
    { question: "How much is NICOP renewal?", answer: "USD 39 normal, 57 urgent or 75 executive in Zone A (USA and Europe); USD 20, 30 or 40 in Zone B (Middle East and Africa), paid in rupees at the official rate." },
  ],
  related: { tools: ["passport-fee-calculator", "age-calculator"], guides: ["how-to-renew-cnic-online-nadra"], entities: ["nadra"] },
};
