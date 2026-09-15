import { NewsletterForm } from "@/components/newsletter-form";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Searchable Daily: the useful morning email about Pakistan",
  description: "Top stories, what changed, one useful number and a tool of the day. Two minutes to read, every morning at 7. Free.",
  path: "/newsletter",
});

const ITEMS = [
  ["Top stories", "Three things that matter today, with the useful context."],
  ["What changed", "Prices, rates, rules, deadlines, the numbers that moved."],
  ["Useful number", "One figure worth knowing: petrol, dollar, gold, policy rate."],
  ["Tool of the day", "A calculator that answers a question people asked yesterday."],
  ["Business spotlight", "A verified business worth knowing about in your city."],
  ["One thing worth knowing", "A guide, a deadline, a process explained."],
];

export default function NewsletterPage() {
  return (
    <div className="container-x py-12 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="eyebrow">Searchable Daily</p>
          <h1 className="mt-2 font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl">The useful morning email about Pakistan</h1>
          <p className="mt-4 text-lg text-2 leading-relaxed">Not a news dump. A short, practical briefing on what changed and what it means for you: with the tool or guide that helps you act on it.</p>
          <dl className="mt-8 space-y-4">
            {ITEMS.map(([t, d]) => (
              <div key={t} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                <div>
                  <dt className="font-medium">{t}</dt>
                  <dd className="text-[15px] text-2">{d}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
        <div className="surface p-6 sm:p-8">
          <p className="text-lg font-semibold">Subscribe free</p>
          <p className="mt-1 text-[15px] text-2">Pick your topics. Daily or weekly. Unsubscribe in one click.</p>
          <div className="mt-5">
            <NewsletterForm source="newsletter-page" />
          </div>
        </div>
      </div>
    </div>
  );
}
