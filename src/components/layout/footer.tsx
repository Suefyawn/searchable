import Link from "next/link";
import { SITE } from "@/lib/utils";
import { NewsletterForm } from "@/components/newsletter-form";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Know",
    links: [
      { href: "/news", label: "News" },
      { href: "/news/economy", label: "Economy" },
      { href: "/news/technology", label: "Technology" },
      { href: "/guides", label: "Guides" },
      { href: "/data", label: "Data & prices" },
    ],
  },
  {
    title: "Do",
    links: [
      { href: "/tools", label: "All calculators" },
      { href: "/tools/tax/income-tax-calculator", label: "Income tax" },
      { href: "/tools/telecom/pta-mobile-tax-calculator", label: "PTA tax" },
      { href: "/tools/utilities/electricity-bill-calculator", label: "Electricity bill" },
      { href: "/tools/finance/zakat-calculator", label: "Zakat" },
    ],
  },
  {
    title: "Find",
    links: [
      { href: "/businesses", label: "Business directory" },
      { href: "/cities/lahore", label: "Lahore" },
      { href: "/cities/karachi", label: "Karachi" },
      { href: "/cities/islamabad", label: "Islamabad" },
      { href: "/add-business", label: "Add your business" },
    ],
  },
  {
    title: "Searchable",
    links: [
      { href: "/about", label: "About" },
      { href: "/editorial-policy", label: "Editorial policy" },
      { href: "/advertise", label: "Advertise" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 px-3 pb-3 sm:px-5">
      <div className="mx-auto max-w-[76rem] rounded-[2rem] bg-ink-950 px-6 py-12 text-ink-200 sm:px-10 sm:py-16 dark:bg-ink-900">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <p className="font-display text-2xl font-bold text-white">
              {SITE.name}
              <span className="text-brand-400">.pk</span>
            </p>
            <p className="mt-3 text-[15px] text-ink-300">{SITE.tagline}</p>
            <p className="mt-6 text-sm font-semibold text-white">Searchable Daily</p>
            <p className="mb-3 text-sm text-ink-400">The useful morning email. Two minutes, every day.</p>
            <div className="[&_input]:bg-ink-800 [&_input]:text-white [&_input]:ring-0 [&_input]:placeholder:text-ink-500 [&_input:focus]:bg-ink-800 [&_p]:text-ink-500">
              <NewsletterForm compact source="footer" />
            </div>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[15px] text-ink-300 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-ink-800 pt-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Made in Pakistan.
          </p>
          <p>Every number shows its source and review date. Confirm with the primary source before acting.</p>
        </div>
      </div>
    </footer>
  );
}
