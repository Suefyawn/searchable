import Link from "next/link";
import { SITE } from "@/lib/utils";
import { Logo } from "./header";
import { NewsletterForm } from "@/components/newsletter-form";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Know",
    links: [
      { href: "/news", label: "News" },
      { href: "/news/business", label: "Business" },
      { href: "/news/technology", label: "Technology" },
      { href: "/guides", label: "Guides" },
      { href: "/data", label: "Data & prices" },
    ],
  },
  {
    title: "Do",
    links: [
      { href: "/tools", label: "All tools" },
      { href: "/tools/tax/income-tax-calculator", label: "Income tax calculator" },
      { href: "/tools/telecom/pta-mobile-tax-calculator", label: "PTA tax calculator" },
      { href: "/tools/utilities/electricity-bill-calculator", label: "Electricity bill" },
      { href: "/tools/finance/zakat-calculator", label: "Zakat calculator" },
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
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-x py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-2 text-[15px]">{SITE.tagline}</p>
            <p className="mt-1 text-sm text-3">{SITE.description}</p>
            <div className="mt-5">
              <p className="text-sm font-medium mb-2">Searchable Daily — the useful morning email</p>
              <NewsletterForm compact source="footer" />
            </div>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold uppercase tracking-wider text-3">{c.title}</p>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[15px] text-2 hover:text-[var(--text)]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-sm text-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. Made in Pakistan.</p>
          <p>Numbers on this site show a “last reviewed” date. Always confirm with the primary source before acting.</p>
        </div>
      </div>
    </footer>
  );
}
