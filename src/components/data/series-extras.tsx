import Link from "next/link";
import { Change } from "@/components/data/change";
import { JsonLd } from "@/components/ui";
import { formatDate, number, pkr } from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { faqJsonLd } from "@/lib/seo";
import type { SeriesContent } from "@/content/data-series";

const TOLA_G = 11.664;

type Latest = { date: string; value: number };
type Related = { slug: string; name: string; unit: string; latest: Latest | null; previous: Latest | null };

function fmtBy(unit: string) {
  return (v: number) => (unit === "%" ? `${number(v, 2)}%` : number(v, Number.isInteger(v) ? 0 : 2));
}

/** Worked figures for the number people actually need: "how much is 100 dollars", "what does a full tank cost". */
export function Conversions({ kind, code, value, usdPkr, date }: { kind: NonNullable<SeriesContent["conversions"]>; code?: string; value: number; usdPkr: number | null; date: string }) {
  let title = "";
  let rows: { label: string; value: string }[] = [];
  if (kind === "fx" && code) {
    title = `${code} to PKR and back`;
    const amounts = [1, 5, 10, 50, 100, 500, 1000];
    rows = [
      ...amounts.map((a) => ({ label: `${number(a)} ${code}`, value: a < 100 ? `Rs ${number(a * value, 2)}` : pkr(a * value) })),
      ...[1000, 10000, 100000].map((r) => ({ label: `Rs ${number(r)}`, value: `${number(r / value, 2)} ${code}` })),
    ];
  } else if (kind === "fuel") {
    title = "What it costs at the pump";
    rows = [
      ...[10, 20, 30, 40, 50, 60].map((l) => ({ label: `${l} litres`, value: pkr(l * value) })),
      { label: "Per kilometre at 12 km per litre", value: `Rs ${number(value / 12, 2)}` },
      { label: "Per kilometre at 18 km per litre", value: `Rs ${number(value / 18, 2)}` },
      { label: "1,000 km a month at 14 km per litre", value: pkr((1000 / 14) * value) },
    ];
  } else if (kind === "silver") {
    title = "By weight";
    rows = [
      { label: "1 gram", value: pkr(value / TOLA_G) },
      { label: "10 grams", value: pkr((value / TOLA_G) * 10) },
      { label: "1 tola", value: pkr(value) },
      { label: "10 tola", value: pkr(value * 10) },
      { label: "1 kilogram", value: pkr((value / TOLA_G) * 1000) },
      { label: "Zakat nisab (52.5 tola)", value: pkr(value * 52.5) },
    ];
  } else if (kind === "crypto" && code) {
    title = `${code} in rupees`;
    rows = usdPkr
      ? [
          { label: `1 ${code}`, value: pkr(value * usdPkr) },
          { label: `0.1 ${code}`, value: pkr(value * usdPkr * 0.1) },
          { label: `0.01 ${code}`, value: pkr(value * usdPkr * 0.01) },
          { label: "Rs 100,000 buys", value: `${(100000 / (value * usdPkr)).toFixed(5)} ${code}` },
          { label: "At interbank USD/PKR", value: number(usdPkr, 2) },
        ]
      : [{ label: `1 ${code}`, value: `$${number(value, 2)}` }];
  }
  if (!rows.length) return null;
  return (
    <section className="border-t border-line pt-4">
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-3">
        {title} <span className="font-normal normal-case tracking-normal">· as of {formatDate(date)}</span>
      </h2>
      <dl className="grid gap-x-8 gap-y-1 text-[15px] sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-4 border-b border-[var(--border)] py-1.5">
            <dt className="text-2">{r.label}</dt>
            <dd className="tabular font-medium">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** "About this number", the FAQ (with FAQPage JSON-LD) and guide links. */
export function Explainer({ name, content }: { name: string; content: SeriesContent }) {
  return (
    <section className="border-t border-line pt-4">
      {content.faqs.length ? <JsonLd data={faqJsonLd(content.faqs)} /> : null}
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-3">About this number</h2>
      <div className="prose-searchable max-w-[68ch] text-[15.5px]" dangerouslySetInnerHTML={{ __html: renderMarkdown(content.about) }} />
      {content.guides?.length ? (
        <p className="mt-3 flex flex-wrap gap-2 text-[14px]">
          {content.guides.map((g) => (
            <Link key={g.href} href={g.href} className="border border-line px-2.5 py-1 hover:bg-surface-2">
              {g.label} →
            </Link>
          ))}
        </p>
      ) : null}
      {content.faqs.length ? (
        <div className="mt-6">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-3">Questions people ask</h2>
          <dl className="divide-y divide-[var(--border)] border-y border-line">
            {content.faqs.map((f) => (
              <div key={f.question} className="py-3">
                <dt className="font-medium">{f.question}</dt>
                <dd className="mt-1 max-w-[68ch] text-[15px] text-2">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  );
}

/** The neighbouring numbers, each with its own change, so the page reads as a desk not a single cell. */
export function RelatedSeries({ items }: { items: Related[] }) {
  const live = items.filter((i) => i.latest);
  if (!live.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-3">Also today</p>
      <ul className="divide-y divide-[var(--border)] border-y border-line text-[14.5px]">
        {live.map((r) => {
          const f = fmtBy(r.unit);
          return (
            <li key={r.slug}>
              <Link href={`/data/${r.slug}`} className="flex items-baseline justify-between gap-3 py-2 hover:bg-surface-2">
                <span className="min-w-0 truncate text-2">{r.name.replace(/ in Pakistan.*$/i, "").replace(/ today$/i, "")}</span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="tabular font-medium">{f(r.latest!.value)}</span>
                  {r.previous ? <Change latest={r.latest!.value} previous={r.previous.value} unit={r.unit} /> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** What the chart shows when there is not yet a history: the value, when tracking began, when the line appears. */
export function ChartPlaceholder({ since, frequency }: { since: string; frequency: string }) {
  const when = frequency === "daily" ? "after a week of readings" : frequency === "fortnightly" ? "after the next two reviews" : "after a few readings";
  return (
    <div className="flex h-40 items-center justify-center border border-dashed border-line px-6 text-center text-[14px] text-3">
      Tracking since {formatDate(since)}. The chart appears {when}; every reading is in the history below.
    </div>
  );
}
