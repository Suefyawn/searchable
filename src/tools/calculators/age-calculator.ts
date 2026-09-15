import { num, str, type ToolDefinition } from "../types";
import { formatDate } from "@/lib/format";

function diff(from: Date, to: Date) {
  let y = to.getFullYear() - from.getFullYear();
  let m = to.getMonth() - from.getMonth();
  let d = to.getDate() - from.getDate();
  if (d < 0) {
    m -= 1;
    d += new Date(to.getFullYear(), to.getMonth(), 0).getDate();
  }
  if (m < 0) {
    y -= 1;
    m += 12;
  }
  return { y, m, d };
}

const DAY = 86_400_000;

export const ageCalculator: ToolDefinition = {
  slug: "age-calculator",
  category: "government",
  name: "Age Calculator — Exact Age, Retirement & Next Birthday",
  seoTitle: "Age Calculator — Exact Age in Years, Months & Days, Retirement Date (60 / 55 / 65), Next Birthday",
  shortName: "Age",
  description: "Your exact age in years, months and days from your date of birth, total days lived, days to your next birthday, and the dates you reach 18, 60 and the retirement age for government, EOBI and private jobs in Pakistan.",
  keywords: ["age calculator", "age calculator pakistan", "date of birth calculator", "how old am i", "exact age calculator", "age in days", "retirement age calculator pakistan", "next birthday calculator", "cnic age", "age difference calculator"],
  version: "1.0.0",
  lastReviewed: "2026-09-15",
  sources: [{ title: "Civil Servants Act 1973 s.13 (superannuation at 60); EOB Act 1976 (60 men / 55 women)", publisher: "Government of Pakistan" }],
  fields: [
    { key: "y", label: "Year of birth", type: "number", default: 1995, min: 1900, max: 2026, step: 1 },
    { key: "m", label: "Month", type: "number", default: 6, min: 1, max: 12, step: 1 },
    { key: "d", label: "Day", type: "number", default: 15, min: 1, max: 31, step: 1 },
    {
      key: "retire",
      label: "Retirement age to show",
      type: "select",
      options: [
        { value: "60", label: "60 — government service, EOBI (men)" },
        { value: "55", label: "55 — EOBI (women)" },
        { value: "65", label: "65 — many private employers / self-employed" },
      ],
      default: "60",
    },
  ],
  compute(input) {
    const y = Math.round(num(input, "y", 1995));
    const m = Math.min(12, Math.max(1, Math.round(num(input, "m", 6))));
    const d = Math.min(31, Math.max(1, Math.round(num(input, "d", 15))));
    const dob = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(dob.getTime()) || dob > today) {
      return { headline: { label: "Age", value: "—", primary: true }, summary: "Enter a date of birth in the past.", sections: [] };
    }
    const age = diff(dob, today);
    const days = Math.floor((today.getTime() - dob.getTime()) / DAY);
    let next = new Date(today.getFullYear(), m - 1, d);
    if (next <= today) next = new Date(today.getFullYear() + 1, m - 1, d);
    const toNext = Math.round((next.getTime() - today.getTime()) / DAY);
    const retireAge = parseInt(str(input, "retire", "60"), 10) || 60;
    const at = (n: number) => new Date(y + n, m - 1, d);
    const weekday = dob.toLocaleDateString("en-PK", { weekday: "long" });
    return {
      headline: { label: "Your age today", value: `${age.y} years, ${age.m} months, ${age.d} days`, primary: true },
      summary: `Born on a ${weekday}, ${formatDate(dob)}. You have lived ${days.toLocaleString()} days. Your next birthday is in ${toNext} day${toNext === 1 ? "" : "s"} (${formatDate(next)}), when you turn ${age.y + 1}.`,
      sections: [
        {
          title: "In other units",
          lines: [
            { label: "Months", value: (age.y * 12 + age.m).toLocaleString() },
            { label: "Weeks", value: Math.floor(days / 7).toLocaleString() },
            { label: "Days", value: days.toLocaleString() },
            { label: "Hours (approx.)", value: (days * 24).toLocaleString(), muted: true },
          ],
        },
        {
          title: "Milestones",
          lines: [
            { label: "Turned / turn 18 (CNIC, voting)", value: formatDate(at(18)) },
            { label: `Retirement at ${retireAge}`, value: formatDate(at(retireAge)), note: at(retireAge) > today ? `${diff(today, at(retireAge)).y} years, ${diff(today, at(retireAge)).m} months away` : "Already reached" },
            { label: "10,000 days old", value: formatDate(new Date(dob.getTime() + 10_000 * DAY)), muted: true },
            { label: "20,000 days old", value: formatDate(new Date(dob.getTime() + 20_000 * DAY)), muted: true },
          ],
        },
      ],
    };
  },
  methodology: `Age is counted in completed years, then completed months, then days, using calendar months (so 31 January → 28 February counts as one month). Days lived are the whole days between the two dates. Milestones use the same calendar day in the target year. Government superannuation is 60 under the Civil Servants Act; EOBI pension age is 60 for men and 55 for women; many private employers use 60 or 65.`,
  faqs: [
    { question: "How is age calculated for CNIC or school admission?", answer: "By the date of birth on the birth certificate or B-form: completed years on the cut-off date. Schools in Pakistan usually require a minimum age on 1 April or 1 September of the admission year — use the exact-age line for that date." },
    { question: "What is the retirement age in Pakistan?", answer: "60 for federal and provincial government servants (superannuation), 60 for men and 55 for women under EOBI; private companies set their own, commonly 60." },
    { question: "How many days until my birthday?", answer: "Shown in the summary — counted to the next occurrence of your birth date. Leap-day births are treated as 1 March in non-leap years." },
  ],
  related: { tools: ["eobi-calculator", "salary-increment-calculator"], guides: ["how-to-renew-cnic-online-nadra"], entities: ["nadra", "eobi"] },
};
