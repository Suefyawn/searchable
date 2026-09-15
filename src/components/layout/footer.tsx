import Link from "next/link";
import { readSiteSettings } from "@/lib/site-settings";
import { SITE } from "@/lib/utils";
import { Wordmark } from "@/components/brand";
import { NewsletterForm } from "@/components/newsletter-form";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Sections",
    links: [
      { href: "/news", label: "News" },
      { href: "/guides", label: "Guides" },
      { href: "/tools", label: "Calculators" },
      { href: "/businesses", label: "Businesses" },
      { href: "/professionals", label: "Professionals" },
      { href: "/community", label: "Community" },
      { href: "/data", label: "Data" },
      { href: "/compare", label: "Compare" },
      { href: "/cities", label: "Cities" },
    ],
  },
  {
    title: "Calculators",
    links: [
      { href: "/tools/tax/income-tax-calculator", label: "Income tax" },
      { href: "/tools/telecom/pta-mobile-tax-calculator", label: "PTA tax" },
      { href: "/tools/utilities/electricity-bill-calculator", label: "Electricity bill" },
      { href: "/tools/finance/zakat-calculator", label: "Zakat" },
      { href: "/electricity", label: "Electricity bill check" },
      { href: "/pta", label: "PTA tax & IMEI check" },
      { href: "/data/solar-panel-price", label: "Solar panel prices" },
    ],
  },
  {
    title: "Cities",
    links: [
      { href: "/cities/lahore", label: "Lahore" },
      { href: "/cities/karachi", label: "Karachi" },
      { href: "/cities/islamabad", label: "Islamabad" },
      { href: "/cities/rawalpindi", label: "Rawalpindi" },
      { href: "/add-business", label: "Add your business" },
    ],
  },
  {
    title: "Searchable",
    links: [
      { href: "/about", label: "About" },
      { href: "/editorial-policy", label: "Editorial policy" },
      { href: "/advertise", label: "Advertise" },
      { href: "/write-for-us", label: "Write for us" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/feed.xml", label: "RSS" },
    ],
  },
];

const SOCIAL_LABELS: Record<string, string> = { x: "X", facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", linkedin: "LinkedIn", tiktok: "TikTok" };

export async function Footer() {
  const site = await readSiteSettings();
  const socials = Object.entries(site.identity.social).filter(([, href]) => href);
  return (
    <footer className="mt-20 border-t border-[var(--rule)]">
      <div className="container-x py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <Wordmark size={24} href={null} />
            <p className="mt-2 font-serif text-[15px] italic text-2">{site.identity.tagline}</p>
            {site.features.newsletterCapture ? (
              <>
                <p className="mt-6 text-[13px] font-semibold uppercase tracking-[0.12em] text-3">Searchable Daily</p>
                <p className="mb-3 mt-1 text-sm text-2">The useful morning email. Two minutes, every day.</p>
                <NewsletterForm compact source="footer" />
              </>
            ) : null}
            {socials.length || site.identity.contactEmail ? (
              <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                {socials.map(([k, href]) => (
                  <a key={k} href={href} target="_blank" rel="noopener" className="underline-offset-4 hover:underline">
                    {SOCIAL_LABELS[k] ?? k}
                  </a>
                ))}
                {site.identity.contactEmail ? (
                  <a href={`mailto:${site.identity.contactEmail}`} className="underline-offset-4 hover:underline">
                    {site.identity.contactEmail}
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-3">{c.title}</p>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[15px] text-2 underline-offset-4 hover:text-[var(--text)] hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-5 text-[13px] text-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Made in Pakistan. Powered by{" "}
            <a href="https://trellee.com" target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-[var(--text)]">
              Trellee
            </a>
            .
          </p>
          <p>Every number shows its source and review date. Confirm with the primary source before acting.</p>
        </div>
      </div>
    </footer>
  );
}
