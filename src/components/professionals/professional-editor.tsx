"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { DocumentUpload, ImageUpload } from "@/components/upload";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { PROFESSION_GROUPS, PROFESSIONS, getProfession, type ProfessionGroup } from "@/content/professions";
import { saveProfessional } from "@/lib/professional-actions";
import type { ProfessionalFormInput } from "@/lib/professional-schema";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string; cityId?: string | null };
type Props = { initial: Partial<ProfessionalFormInput>; cities: Opt[]; areas: Opt[]; afterSave?: "dashboard" | "stay" };

const LANGS = ["Urdu", "English", "Punjabi", "Sindhi", "Pashto", "Balochi", "Saraiki", "Arabic"];

/** Owner and admin editor for a professional profile. Everything optional beyond name and profession. */
export function ProfessionalEditor({ initial, cities, areas, afterSave = "dashboard" }: Props) {
  const router = useRouter();
  const [professionSlug, setProfessionSlug] = React.useState(initial.professionSlug ?? "");
  const [cityId, setCityId] = React.useState(initial.cityId ?? "");
  const [photoUrl, setPhotoUrl] = React.useState(initial.photoUrl ?? "");
  const [cvUrl, setCvUrl] = React.useState(initial.cvUrl ?? "");
  const [skills, setSkills] = React.useState<string[]>(initial.skills ?? []);
  const [skillDraft, setSkillDraft] = React.useState("");
  const [languages, setLanguages] = React.useState<string[]>(initial.languages ?? []);
  const [services, setServices] = React.useState(initial.services ?? []);
  const [experience, setExperience] = React.useState(initial.experience ?? []);
  const [education, setEducation] = React.useState(initial.education ?? []);
  const [certifications, setCertifications] = React.useState(initial.certifications ?? []);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const prof = getProfession(professionSlug);
  const cityAreas = areas.filter((a) => a.cityId === cityId);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const num = (k: string) => (get(k) ? Number(get(k)) : undefined);
    setBusy(true);
    setMsg(null);
    const res = await saveProfessional({
      id: initial.id,
      name: get("name"),
      professionSlug,
      headline: get("headline") || undefined,
      bio: get("bio") || undefined,
      cityId: cityId || undefined,
      areaId: get("areaId") || undefined,
      workplace: get("workplace") || undefined,
      serviceMode: (get("serviceMode") || undefined) as "in_person" | "online" | "both" | undefined,
      phone: get("phone") || undefined,
      whatsapp: get("whatsapp") || undefined,
      email: get("email") || undefined,
      showEmail: fd.get("showEmail") === "on",
      website: get("website") || undefined,
      linkedin: get("linkedin") || undefined,
      x: get("x") || undefined,
      instagram: get("instagram") || undefined,
      facebook: get("facebook") || undefined,
      github: get("github") || undefined,
      youtube: get("youtube") || undefined,
      tiktok: get("tiktok") || undefined,
      behance: get("behance") || undefined,
      languages,
      skills,
      services: services.filter((s) => s.name.trim()),
      experience: experience.filter((x) => x.title.trim()),
      education: education.filter((x) => x.degree.trim()),
      certifications: certifications.filter((x) => x.name.trim()),
      yearsExperience: num("yearsExperience"),
      licenceNo: get("licenceNo") || undefined,
      availability: get("availability") || undefined,
      rateFrom: num("rateFrom"),
      rateUnit: get("rateUnit") || undefined,
      cvUrl: cvUrl || undefined,
      cvPublic: fd.get("cvPublic") === "on",
      photoUrl: photoUrl || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setMsg({ tone: "err", text: res.error ?? "Could not save" });
      return;
    }
    setMsg({ tone: "ok", text: initial.id ? "Saved." : "Profile created. It goes live once an editor has looked at it, usually within a working day." });
    if (!initial.id && res.id) router.push(afterSave === "dashboard" ? "/professional" : `/professional/${res.id}`);
    else router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-10">
        <Section title="Who you are">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name">
              <Input id="name" name="name" defaultValue={initial.name} required minLength={2} maxLength={120} />
            </Field>
            <Field label="Profession" htmlFor="professionSlug">
              <Select id="professionSlug" value={professionSlug} onChange={(e) => setProfessionSlug(e.target.value)} required>
                <option value="">Choose…</option>
                {(Object.keys(PROFESSION_GROUPS) as ProfessionGroup[]).map((g) => (
                  <optgroup key={g} label={PROFESSION_GROUPS[g]}>
                    {PROFESSIONS.filter((p) => p.group === g).map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Headline" htmlFor="headline" help="One line that says what you do and for whom: “Consultant cardiologist, 12 years, Shifa International”.">
            <Input id="headline" name="headline" defaultValue={initial.headline} maxLength={160} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Years of experience" htmlFor="yearsExperience">
              <Input id="yearsExperience" name="yearsExperience" type="number" min={0} max={70} defaultValue={initial.yearsExperience ?? ""} />
            </Field>
            <Field label={prof?.licence?.label ?? "Registration or licence no."} htmlFor="licenceNo" help={prof?.licence ? `Shown on your profile; checked at verification.` : "If your profession has one."}>
              <Input id="licenceNo" name="licenceNo" defaultValue={initial.licenceNo} maxLength={60} />
            </Field>
            <Field label="How you work" htmlFor="serviceMode">
              <Select id="serviceMode" name="serviceMode" defaultValue={initial.serviceMode ?? ""}>
                <option value="">Not said</option>
                <option value="in_person">In person</option>
                <option value="online">Online only</option>
                <option value="both">In person and online</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="City" htmlFor="cityId">
              <Select id="cityId" value={cityId} onChange={(e) => setCityId(e.target.value)}>
                <option value="">Choose…</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Area" htmlFor="areaId">
              <Select id="areaId" name="areaId" defaultValue={initial.areaId ?? ""} disabled={!cityAreas.length}>
                <option value="">{cityAreas.length ? "Choose…" : "No areas listed"}</option>
                {cityAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Where clients find you" htmlFor="workplace" help="Clinic, office, or “home visits in DHA and Gulberg”.">
              <Input id="workplace" name="workplace" defaultValue={initial.workplace} maxLength={200} />
            </Field>
          </div>
          <Field label="About you" htmlFor="bio" help="Plain text or Markdown. What you do, who you help, what makes you good at it. Up to 4,000 characters.">
            <Textarea id="bio" name="bio" defaultValue={initial.bio} maxLength={4000} className="min-h-40" />
          </Field>
        </Section>

        <Section title="Services and fees">
          <RowList
            rows={services}
            onChange={setServices}
            blank={{ name: "" }}
            max={20}
            addLabel="Add a service"
            render={(row, set) => (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_120px]">
                <Input value={row.name} onChange={(e) => set({ ...row, name: e.target.value })} placeholder="Service, e.g. Consultation" maxLength={120} />
                <Input value={row.priceFrom ?? ""} onChange={(e) => set({ ...row, priceFrom: e.target.value ? Number(e.target.value) : undefined })} type="number" min={0} placeholder="From Rs" />
                <Input value={row.unit ?? ""} onChange={(e) => set({ ...row, unit: e.target.value })} placeholder="per visit" maxLength={30} />
              </div>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Typical fee from (Rs)" htmlFor="rateFrom">
              <Input id="rateFrom" name="rateFrom" type="number" min={0} defaultValue={initial.rateFrom ?? ""} />
            </Field>
            <Field label="Per" htmlFor="rateUnit">
              <Input id="rateUnit" name="rateUnit" defaultValue={initial.rateUnit} placeholder="visit, hour, project" maxLength={30} />
            </Field>
            <Field label="Availability" htmlFor="availability">
              <Input id="availability" name="availability" defaultValue={initial.availability} placeholder="Mon to Sat, 10am to 6pm" maxLength={160} />
            </Field>
          </div>
        </Section>

        <Section title="Experience">
          <RowList
            rows={experience}
            onChange={setExperience}
            blank={{ title: "" }}
            max={15}
            addLabel="Add a role"
            render={(row, set) => (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={row.title} onChange={(e) => set({ ...row, title: e.target.value })} placeholder="Role, e.g. Senior Registrar" maxLength={120} />
                  <Input value={row.org ?? ""} onChange={(e) => set({ ...row, org: e.target.value })} placeholder="Organisation" maxLength={120} />
                </div>
                <div className="grid gap-2 sm:grid-cols-[120px_120px_minmax(0,1fr)]">
                  <Input value={row.from ?? ""} onChange={(e) => set({ ...row, from: e.target.value })} placeholder="From (2019)" maxLength={10} />
                  <Input value={row.to ?? ""} onChange={(e) => set({ ...row, to: e.target.value })} placeholder="To (blank = now)" maxLength={10} />
                  <Input value={row.description ?? ""} onChange={(e) => set({ ...row, description: e.target.value })} placeholder="What you did there (optional)" maxLength={400} />
                </div>
              </div>
            )}
          />
        </Section>

        <Section title="Education and certifications">
          <p className="eyebrow mb-2">Education</p>
          <RowList
            rows={education}
            onChange={setEducation}
            blank={{ degree: "" }}
            max={10}
            addLabel="Add a qualification"
            render={(row, set) => (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px]">
                <Input value={row.degree} onChange={(e) => set({ ...row, degree: e.target.value })} placeholder="Degree, e.g. MBBS" maxLength={120} />
                <Input value={row.institution ?? ""} onChange={(e) => set({ ...row, institution: e.target.value })} placeholder="Institution" maxLength={120} />
                <Input value={row.year ?? ""} onChange={(e) => set({ ...row, year: e.target.value })} placeholder="Year" maxLength={10} />
              </div>
            )}
          />
          <p className="eyebrow mb-2 mt-6">Certifications and licences</p>
          <RowList
            rows={certifications}
            onChange={setCertifications}
            blank={{ name: "" }}
            max={15}
            addLabel="Add a certification"
            render={(row, set) => (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px_130px]">
                <Input value={row.name} onChange={(e) => set({ ...row, name: e.target.value })} placeholder="Name, e.g. FCPS Cardiology" maxLength={120} />
                <Input value={row.issuer ?? ""} onChange={(e) => set({ ...row, issuer: e.target.value })} placeholder="Issued by" maxLength={120} />
                <Input value={row.year ?? ""} onChange={(e) => set({ ...row, year: e.target.value })} placeholder="Year" maxLength={10} />
                <Input value={row.number ?? ""} onChange={(e) => set({ ...row, number: e.target.value })} placeholder="Number" maxLength={60} />
              </div>
            )}
          />
        </Section>

        <Section title="Skills and languages">
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Skills (up to 20)</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <button key={s} type="button" onClick={() => setSkills(skills.filter((x) => x !== s))} className="border border-line px-2 py-0.5 text-[13px] hover:bg-surface-2" title="Remove">
                  {s} ×
                </button>
              ))}
              <input
                value={skillDraft}
                onChange={(e) => setSkillDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const t = skillDraft.trim().replace(/,+$/, "");
                    if (t && !skills.includes(t) && skills.length < 20) setSkills([...skills, t]);
                    setSkillDraft("");
                  }
                }}
                placeholder="Type a skill and press Enter"
                className="h-7 min-w-56 flex-1 border-b border-line bg-transparent px-1 text-[13.5px] outline-none focus:border-ink-500"
              />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Languages</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[14px]">
              {LANGS.map((l) => (
                <label key={l} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={languages.includes(l)} onChange={(e) => setLanguages(e.target.checked ? [...languages, l] : languages.filter((x) => x !== l))} className="accent-ink-900" /> {l}
                </label>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Contact and handles">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={initial.phone} maxLength={20} inputMode="tel" placeholder="03xx xxxxxxx" />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp">
              <Input id="whatsapp" name="whatsapp" defaultValue={initial.whatsapp} maxLength={20} inputMode="tel" />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" defaultValue={initial.email} maxLength={120} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-[14px]">
              <input type="checkbox" name="showEmail" defaultChecked={initial.showEmail} className="accent-ink-900" /> Show my email on the profile
            </label>
            <Field label="Website or portfolio" htmlFor="website">
              <Input id="website" name="website" defaultValue={initial.website} maxLength={200} placeholder="yourname.com" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(["linkedin", "x", "instagram", "facebook", "github", "youtube", "tiktok", "behance"] as const).map((k) => (
              <Field key={k} label={k === "x" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)} htmlFor={k}>
                <Input id={k} name={k} defaultValue={initial[k]} maxLength={200} placeholder="handle or URL" />
              </Field>
            ))}
          </div>
        </Section>
      </div>

      <aside className="space-y-6 self-start lg:sticky lg:top-24">
        <div className="space-y-3 border-y-2 border-[var(--rule)] py-4">
          <Button type="submit" disabled={busy || !professionSlug} className="w-full">
            {busy ? "Saving…" : initial.id ? "Save profile" : "Create profile"}
          </Button>
          {msg ? <p className={cn("text-[13.5px]", msg.tone === "err" ? "font-medium" : "text-2")}>{msg.text}</p> : null}
          {!initial.id ? <p className="text-[12.5px] text-3">New profiles are checked by an editor before they appear. You can edit any time.</p> : null}
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Photo</p>
          <ImageUpload variant="avatar" value={photoUrl} onChange={setPhotoUrl} label="Upload a photo" aspect="1/1" className="max-w-48" />
          <p className="mt-1 text-[12.5px] text-3">Profiles with a photo get about twice the enquiries.</p>
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">CV</p>
          <DocumentUpload value={cvUrl} onChange={setCvUrl} label="Upload your CV" hint="PDF up to 5 MB" fileLabel="Your CV (PDF)" />
          <label className="mt-2 flex items-center gap-2 text-[13.5px]">
            <input type="checkbox" name="cvPublic" defaultChecked={initial.cvPublic ?? true} className="accent-ink-900" /> Let visitors download it
          </label>
        </div>
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-b-2 border-[var(--rule)] pb-1.5 font-serif text-xl font-medium">{title}</h2>
      {children}
    </section>
  );
}

function RowList<T>({ rows, onChange, blank, max, addLabel, render }: { rows: T[]; onChange: (rows: T[]) => void; blank: T; max: number; addLabel: string; render: (row: T, set: (row: T) => void) => React.ReactNode }) {
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{render(row, (next) => onChange(rows.map((r, j) => (j === i ? next : r))))}</div>
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="mt-2.5 text-[13px] text-3 hover:text-[var(--text)]" aria-label="Remove">
            ×
          </button>
        </div>
      ))}
      {rows.length < max ? (
        <button type="button" onClick={() => onChange([...rows, blank])} className="text-[13.5px] font-medium underline-offset-4 hover:underline">
          + {addLabel}
        </button>
      ) : null}
    </div>
  );
}
