import Link from "next/link";
import { AdminPage, Section } from "@/components/admin";
import { ActionForm } from "@/components/admin/action-form";
import { Field, Input, Textarea } from "@/components/ui";
import { listSeriesWithLatest } from "@/db/queries/data";
import { requireRole } from "@/lib/auth";
import { readSiteSettings } from "@/lib/site-settings";
import { saveFeatures, saveFront, saveIdentity } from "./actions";
import { BrandEditor } from "./brand-editor";

export const dynamic = "force-dynamic";

/** Everything about the site an admin can tune without a deployment: brand kit, identity, front page, switches. */
export default async function AdminSettings() {
  await requireRole("admin");
  const [s, series] = await Promise.all([readSiteSettings(), listSeriesWithLatest()]);
  const toggles: { key: keyof typeof s.features; label: string; help: string }[] = [
    { key: "homeWorld", label: "Homepage: world, markets, sport, tech desks", help: "Four columns of our own stories by desk." },
    { key: "homeCommunity", label: "Homepage: community strip", help: "Latest posts, jobs and questions." },
    { key: "homeProfessionals", label: "Homepage: professionals strip", help: "Recent professional profiles." },
    { key: "newsletterCapture", label: "Newsletter boxes", help: "The sign-up box on the homepage and under articles." },
  ];
  return (
    <AdminPage
      title="Settings"
      description={
        <>
          Brand kit, identity, front-page rhythm and switches. Saved to the database and live on the next page load; nothing here needs a deployment. The public brand page is at <Link href="/brand" className="underline underline-offset-4">/brand</Link>; the lead story and breaking bar are on <Link href="/admin/front-page" className="underline underline-offset-4">Front page</Link>.
        </>
      }
    >
      <div className="space-y-12">
        <Section title="Brand kit" description="Five colours; every other colour on the site is mixed from them (globals.css). Type, spacing and rules are fixed by design.">
          <BrandEditor brand={s.brand} />
        </Section>

        <Section title="Identity" description="The lines the header, footer, contact page and share cards use. The site name itself is fixed.">
          <ActionForm action={saveIdentity} submit="Save identity" pendingLabel="Saving" className="max-w-2xl space-y-4">
            <Field label="Tagline" htmlFor="tagline">
              <Input id="tagline" name="tagline" defaultValue={s.identity.tagline} maxLength={120} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact email" htmlFor="contactEmail" help="Shown on the contact page and in the footer.">
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={s.identity.contactEmail} maxLength={200} />
              </Field>
              <Field label="WhatsApp number" htmlFor="whatsapp" help="For claims and enquiries, e.g. +92 317 4562693.">
                <Input id="whatsapp" name="whatsapp" defaultValue={s.identity.whatsapp} maxLength={30} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["x", "facebook", "instagram", "youtube", "linkedin", "tiktok"] as const).map((k) => (
                <Field key={k} label={k === "x" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)} htmlFor={k}>
                  <Input id={k} name={k} type="url" defaultValue={s.identity.social[k]} placeholder="https://" maxLength={300} />
                </Field>
              ))}
            </div>
          </ActionForm>
        </Section>

        <Section title="Front page" description="How the homepage moves. What leads it is set on the Front page desk.">
          <ActionForm action={saveFront} submit="Save front page" pendingLabel="Saving" className="max-w-2xl space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hero slides" htmlFor="heroSlides" help="2 to 6 stories with photos.">
                <Input id="heroSlides" name="heroSlides" type="number" min={2} max={6} defaultValue={s.front.heroSlides} required />
              </Field>
              <Field label="Seconds per slide" htmlFor="carouselSeconds" help="4 to 20.">
                <Input id="carouselSeconds" name="carouselSeconds" type="number" min={4} max={20} defaultValue={s.front.carouselSeconds} required />
              </Field>
            </div>
            <Field label="Ticker order" htmlFor="tickerOrder" help={`Series slugs, one per line or comma-separated, in the order the numbers rail shows them; anything left out follows. Available: ${series.map((x) => x.slug).join(", ")}.`}>
              <Textarea id="tickerOrder" name="tickerOrder" rows={4} defaultValue={s.front.tickerOrder.join("\n")} className="font-mono text-[13px]" />
            </Field>
          </ActionForm>
        </Section>

        <Section title="Switches" description="Turn sections off while they are thin, on when they have something to show.">
          <ActionForm action={saveFeatures} submit="Save switches" pendingLabel="Saving" className="max-w-2xl">
            <ul className="divide-y divide-[var(--border)] border-y border-line">
              {toggles.map((t) => (
                <li key={t.key} className="py-2.5">
                  <label className="flex items-start gap-3 text-[14.5px]">
                    <input type="checkbox" name={t.key} defaultChecked={s.features[t.key]} className="mt-1 size-4" />
                    <span>
                      <span className="block font-medium">{t.label}</span>
                      <span className="block text-[13px] text-3">{t.help}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </ActionForm>
        </Section>
      </div>
    </AdminPage>
  );
}
