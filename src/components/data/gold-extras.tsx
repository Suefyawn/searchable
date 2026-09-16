import Link from "next/link";
import { JsonLd } from "@/components/ui";
import { formatDate, number, pkr } from "@/lib/format";
import { faqJsonLd } from "@/lib/seo";

const TOLA_G = 11.664;
const OUNCE_G = 31.1035;

/** Cities people search gold rates for, with the typical local premium over the Karachi Sarafa quote. */
const CITIES = [
  { slug: "karachi", name: "Karachi", premium: 0, note: "Karachi Sarafa (Tariq Road, Saddar) sets the reference rate published by the All Pakistan Sarafa association." },
  { slug: "lahore", name: "Lahore", premium: 0, note: "Lahore Sarafa (Suha Bazar, Anarkali) follows the Karachi quote; jewellers add making charges of 8–15%." },
  { slug: "islamabad", name: "Islamabad", premium: 200, note: "Islamabad and Rawalpindi (Sarafa Bazar, Raja Bazar) usually quote Rs 100–300 above Karachi per tola." },
  { slug: "rawalpindi", name: "Rawalpindi", premium: 200, note: "Raja Bazar Sarafa is the reference for the twin cities." },
  { slug: "peshawar", name: "Peshawar", premium: 300, note: "Ander Sher Sarafa Bazar; premiums widen when Afghan demand is high." },
  { slug: "quetta", name: "Quetta", premium: 300, note: "Liaquat Bazar; supply is thinner so the spread over Karachi is larger." },
  { slug: "multan", name: "Multan", premium: 100, note: "Sarafa Bazar, Hussain Agahi." },
  { slug: "faisalabad", name: "Faisalabad", premium: 100, note: "Rail Bazar Sarafa." },
  { slug: "hyderabad", name: "Hyderabad", premium: 50, note: "Resham Gali Sarafa." },
  { slug: "sialkot", name: "Sialkot", premium: 150, note: "Sarafa Bazar, Sialkot." },
];

const PURITIES = [
  { karat: "24K", factor: 1 },
  { karat: "22K", factor: 22 / 24 },
  { karat: "21K", factor: 21 / 24 },
  { karat: "18K", factor: 18 / 24 },
];

/** Extra sections for the gold series pages: city rates, purity/weight table, FAQs. */
export function GoldExtras({ slug, latestPerTola, date }: { slug: string; latestPerTola: number; date: string }) {
  const is22 = slug === "gold-22k-tola";
  const per24Tola = is22 ? latestPerTola / (22 / 24) : latestPerTola;
  const perGram24 = per24Tola / TOLA_G;
  const faqs = [
    { question: "What is the gold rate in Pakistan today?", answer: `24K gold is ${pkr(per24Tola)} per tola (${pkr(perGram24)} per gram) as of ${formatDate(date)}, based on the Karachi Sarafa quote. 22K is ${pkr(per24Tola * (22 / 24))} per tola.` },
    { question: "Is the gold rate different in Karachi, Lahore and Islamabad?", answer: "The base rate is the same nationwide because it is derived from the international price and the rupee. Local Sarafa markets add a small premium: usually Rs 0–300 per tola: and jewellers add making charges on top." },
    { question: "How is 1 tola gold price calculated?", answer: "1 tola = 11.664 grams. The Sarafa rate is roughly the international spot price per ounce ÷ 31.1035 × 11.664 × USD/PKR, plus a local premium for duties, dealer margin and demand." },
    { question: "What is the difference between 24K and 22K gold?", answer: "24K is 99.9% pure and used for bars and coins. 22K is 91.67% pure: the standard for jewellery in Pakistan: so its price per tola is 22/24 of the 24K rate." },
    { question: "Why does the gold rate change every day?", answer: "It tracks the international gold price (which moves on interest rates, the dollar and geopolitics) and the USD/PKR exchange rate. A weaker rupee raises the local rate even when world gold is flat." },
    { question: "Is zakat due on gold?", answer: "Yes, if your gold and other zakatable wealth exceed the nisab for a lunar year. Use the Zakat Calculator with today's rate: it pre-fills from this page." },
  ];

  return (
    <>
      <JsonLd data={faqJsonLd(faqs)} />
      <section>
        <h2 className="font-display text-2xl">Gold rate by weight and purity</h2>
        <p className="mt-2 text-[15px] text-2">Derived from today’s 24K per-tola rate. 1 tola = 11.664 g; 1 troy ounce = 31.1035 g.</p>
        <table className="mt-3 w-full text-[15px]">
          <thead className="text-left text-xs uppercase tracking-wider text-3">
            <tr className="border-b border-[var(--rule)]">
              <th className="py-2 pr-3 font-medium">Purity</th>
              <th className="py-2 pr-3 text-right font-medium">Per tola</th>
              <th className="py-2 pr-3 text-right font-medium">Per 10 g</th>
              <th className="py-2 pr-3 text-right font-medium">Per gram</th>
              <th className="py-2 text-right font-medium">Per ounce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {PURITIES.map((p) => {
              const g = perGram24 * p.factor;
              return (
                <tr key={p.karat}>
                  <td className="py-2 pr-3 font-medium">{p.karat}</td>
                  <td className="py-2 pr-3 text-right tabular">{pkr(g * TOLA_G)}</td>
                  <td className="py-2 pr-3 text-right tabular">{pkr(g * 10)}</td>
                  <td className="py-2 pr-3 text-right tabular">{pkr(g)}</td>
                  <td className="py-2 text-right tabular">{pkr(g * OUNCE_G)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-display text-2xl">Gold rate today by city</h2>
        <p className="mt-2 text-[15px] text-2">Same base rate everywhere; the figures below add each market’s typical premium. Jewellers quote higher after making charges.</p>
        <div className="mt-3 divide-y divide-[var(--border)] border-y border-line">
          {CITIES.map((c) => {
            const tola24 = per24Tola + c.premium;
            return (
              <div key={c.slug} id={c.slug} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[10rem_1fr_auto]">
                <h3 className="font-display text-lg">
                  <Link href={`/cities/${c.slug}`} className="headline-link">
                    {c.name}
                  </Link>
                </h3>
                <p className="text-sm text-2">{c.note}</p>
                <p className="text-right text-[15px] tabular">
                  <span className="font-medium">{pkr(tola24)}</span> <span className="text-3">24K/tola</span>
                  <span className="block text-sm text-2">
                    {pkr(tola24 * (22 / 24))} <span className="text-3">22K/tola</span>
                  </span>
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-3">Premiums are typical ranges observed in 2026, not live quotes per city. Base: Karachi Sarafa {number(per24Tola, 0)} on {formatDate(date)}.</p>
      </section>

      <section>
        <h2 className="font-display text-2xl">Frequently asked questions</h2>
        <dl className="mt-4 divide-y divide-[var(--border)] border-y border-line">
          {faqs.map((f) => (
            <div key={f.question} className="py-4">
              <dt className="font-medium">{f.question}</dt>
              <dd className="mt-1.5 text-[15px] leading-relaxed text-2">{f.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
