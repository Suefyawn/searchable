import { num, str, type Field, type ToolDefinition } from "../types";
import { number } from "@/lib/format";

/** HEC's recommended 4.0 scale for semester-system universities. Institutions vary at the edges; the grade points are the common ones. */
const GRADES: { value: string; label: string; points: number }[] = [
  { value: "A", label: "A (4.0)", points: 4 },
  { value: "A-", label: "A- (3.7)", points: 3.7 },
  { value: "B+", label: "B+ (3.3)", points: 3.3 },
  { value: "B", label: "B (3.0)", points: 3 },
  { value: "B-", label: "B- (2.7)", points: 2.7 },
  { value: "C+", label: "C+ (2.3)", points: 2.3 },
  { value: "C", label: "C (2.0)", points: 2 },
  { value: "C-", label: "C- (1.7)", points: 1.7 },
  { value: "D+", label: "D+ (1.3)", points: 1.3 },
  { value: "D", label: "D (1.0)", points: 1 },
  { value: "F", label: "F (0)", points: 0 },
  { value: "", label: "Not taken", points: 0 },
];
const POINTS = Object.fromEntries(GRADES.map((g) => [g.value, g.points]));
const COURSES = 6;

const courseFields: Field[] = Array.from({ length: COURSES }, (_, i) => i + 1).flatMap((n): Field[] => [
  { key: `c${n}`, label: `Course ${n}: credit hours`, type: "number", default: n <= 5 ? 3 : 0, min: 0, max: 6, step: 1 },
  { key: `g${n}`, label: `Course ${n}: grade`, type: "select", options: GRADES.map((g) => ({ value: g.value, label: g.label })), default: n <= 5 ? ["A", "B+", "A-", "B", "A"][n - 1] : "" },
]);

export const cgpaCalculator: ToolDefinition = {
  slug: "cgpa-calculator",
  category: "education",
  name: "CGPA Calculator (HEC 4.0 Scale)",
  seoTitle: "CGPA Calculator Pakistan: Semester GPA and Cumulative CGPA on the HEC 4.0 Scale",
  shortName: "CGPA",
  description: "Work out this semester's GPA from your grades and credit hours, then your cumulative CGPA with your previous semesters, on the 4.0 scale Pakistani universities use.",
  keywords: ["cgpa calculator", "gpa calculator", "cgpa calculator pakistan", "semester gpa calculator", "hec gpa scale", "how to calculate cgpa", "gpa to cgpa", "cgpa formula", "university gpa calculator", "credit hours gpa"],
  version: "1.0.0",
  lastReviewed: "2026-09-18",
  sources: [{ title: "HEC: Semester system guidelines, letter grades and grade points on the 4.0 scale", url: "https://www.hec.gov.pk/", publisher: "Higher Education Commission" }],
  fields: [
    ...courseFields,
    { key: "prevCgpa", label: "CGPA so far (before this semester)", type: "number", default: 0, min: 0, max: 4, step: 0.01, help: "Leave 0 if this is your first semester." },
    { key: "prevCredits", label: "Credit hours completed so far", type: "number", default: 0, min: 0, max: 200, step: 1 },
  ],
  compute(input) {
    let credits = 0;
    let points = 0;
    const lines: { label: string; value: string; muted?: boolean }[] = [];
    for (let n = 1; n <= COURSES; n++) {
      const c = Math.max(0, num(input, `c${n}`));
      const g = str(input, `g${n}`, "");
      if (!c || !(g in POINTS) || g === "") continue;
      credits += c;
      points += c * POINTS[g];
      lines.push({ label: `Course ${n}: ${c} credit hours, grade ${g}`, value: `${number(c * POINTS[g], 1)} points`, muted: true });
    }
    const gpa = credits ? points / credits : 0;
    const prevCgpa = Math.min(4, Math.max(0, num(input, "prevCgpa")));
    const prevCredits = Math.max(0, num(input, "prevCredits"));
    const totalCredits = credits + prevCredits;
    const cgpa = totalCredits ? (points + prevCgpa * prevCredits) / totalCredits : gpa;
    const standing = cgpa >= 3.7 ? "Distinction range (3.7 and above)" : cgpa >= 3.0 ? "Good standing (3.0 and above)" : cgpa >= 2.0 ? "Pass (2.0 and above)" : credits ? "Below 2.0: probation at most universities" : "";
    return {
      headline: { label: prevCredits ? "Cumulative CGPA" : "Semester GPA", value: number(prevCredits ? cgpa : gpa, 2), primary: true },
      summary: credits
        ? `This semester: ${number(points, 1)} grade points over ${credits} credit hours, a GPA of ${number(gpa, 2)}.${prevCredits ? ` With ${number(prevCgpa, 2)} over your earlier ${prevCredits} credit hours, your CGPA is ${number(cgpa, 2)} over ${totalCredits} credit hours.` : ""}${standing ? ` ${standing}.` : ""}`
        : "Enter the credit hours and grade of each course you took this semester.",
      sections: [
        { title: "This semester", lines: [...lines, { label: "Semester GPA", value: number(gpa, 2) }] },
        ...(prevCredits
          ? [
              {
                title: "Cumulative",
                lines: [
                  { label: `Earlier: ${prevCredits} credit hours at ${number(prevCgpa, 2)}`, value: `${number(prevCgpa * prevCredits, 1)} points`, muted: true },
                  { label: `Total credit hours`, value: String(totalCredits), muted: true },
                  { label: "CGPA", value: number(cgpa, 2), primary: true },
                ],
              },
            ]
          : []),
        {
          title: "To raise your CGPA",
          lines: [3.0, 3.5, 3.7]
            .filter((t) => t > cgpa && totalCredits > 0)
            .map((t) => {
              const next = 15;
              const need = (t * (totalCredits + next) - (points + prevCgpa * prevCredits)) / next;
              return { label: `For ${number(t, 1)} after one more ${next}-credit semester`, value: need > 4 ? "Not reachable in one semester" : `GPA of ${number(need, 2)} needed`, muted: true };
            }),
        },
      ],
      warnings: ["Grade points follow HEC's common 4.0 scale. Some universities use A+ (4.0) with A at 3.7, or percentage bands; check your prospectus if a grade here does not match your transcript."],
    };
  },
  methodology: `Semester **GPA** is the credit-weighted average of grade points: multiply each course's credit hours by the grade point of the letter you earned, add them up, and divide by the total credit hours.

**CGPA** does the same across every semester: *(sum of grade points earned so far) / (credit hours completed so far)*. Because earlier semesters are weighted by their credit hours, this calculator only needs your CGPA to date and the credit hours it covers.

The grade points are HEC's recommended 4.0 scale (A 4.0, A- 3.7, B+ 3.3, B 3.0, B- 2.7, C+ 2.3, C 2.0, C- 1.7, D+ 1.3, D 1.0, F 0). A course with a grade of F still counts its credit hours in the denominator, which is why a fail pulls the average down more than a low pass.`,
  faqs: [
    { question: "How is CGPA calculated in Pakistan?", answer: "Total grade points earned across all semesters divided by total credit hours attempted. Grade points are credit hours multiplied by the grade's points on the 4.0 scale." },
    { question: "What is a good CGPA?", answer: "Most universities need 2.0 to graduate and 2.5 to 3.0 for scholarships and postgraduate admission; 3.7 and above is usually the distinction or dean's list range." },
    { question: "What CGPA is 80 percent?", answer: "There is no exact conversion; HEC's guidance places 80 to 84 percent in the A- band (3.7) at most universities, and 85 and above at A (4.0). Your university's rule applies." },
    { question: "Does a repeated course replace the old grade?", answer: "At most universities the better grade counts and the failed attempt stays on the transcript. This calculator counts what you enter, so enter the grade that counts." },
  ],
  related: { tools: ["age-calculator"], guides: [], entities: [] },
};
