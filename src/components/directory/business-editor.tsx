"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { ImageGalleryUpload, ImageUpload } from "@/components/image-upload";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { saveBusiness } from "@/lib/business-actions";
import type { BusinessFormInput } from "@/lib/business-schema";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string; cityId?: string | null };
type HourRow = { dayOfWeek: number; opens: string | null; closes: string | null; isClosed: boolean };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function BusinessEditor({ initial, categories, cities, areas, entities = [] }: { initial: BusinessFormInput; categories: Opt[]; cities: Opt[]; areas: Opt[]; entities?: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [cityId, setCityId] = React.useState(initial.cityId ?? "");
  const [hours, setHours] = React.useState<HourRow[]>(() =>
    DAYS.map((_, d) => initial.hours.find((h) => h.dayOfWeek === d) ?? { dayOfWeek: d, opens: "09:00", closes: "21:00", isClosed: false }),
  );
  const [services, setServices] = React.useState(initial.services);
  const [logoUrl, setLogoUrl] = React.useState(initial.logoUrl ?? "");
  const [coverUrl, setCoverUrl] = React.useState(initial.coverUrl ?? "");
  const [photos, setPhotos] = React.useState(initial.photos ?? []);
  const [entitySlugs, setEntitySlugs] = React.useState<string[]>(initial.entitySlugs ?? []);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const cityAreas = areas.filter((a) => a.cityId === cityId);

  async function submit() {
    const fd = new FormData(formRef.current!);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    setBusy(true);
    setMsg(null);
    const res = await saveBusiness({
      id: initial.id,
      name: get("name"),
      tagline: get("tagline") || undefined,
      description: get("description") || undefined,
      primaryCategoryId: get("primaryCategoryId") || undefined,
      cityId: cityId || undefined,
      areaId: get("areaId") || undefined,
      address: get("address") || undefined,
      phone: get("phone") || undefined,
      whatsapp: get("whatsapp") || undefined,
      email: get("email") || undefined,
      website: get("website") || undefined,
      facebook: get("facebook") || undefined,
      instagram: get("instagram") || undefined,
      priceRange: Number(get("priceRange") || 0) || undefined,
      logoUrl: logoUrl || undefined,
      coverUrl: coverUrl || undefined,
      photos,
      entitySlugs,
      hours: hours.map((h) => (h.isClosed ? { ...h, opens: null, closes: null } : h)),
      services: services.filter((s) => s.name.trim()),
    });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error ?? "Could not save" });
    if (res.ok) router.refresh();
  }

  function copyMondayToAll() {
    const mon = hours[1];
    setHours(hours.map((h) => ({ ...h, opens: mon.opens, closes: mon.closes, isClosed: mon.isClosed })));
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <section className="surface p-5 space-y-4">
          <h2 className="font-semibold">Basics</h2>
          <Field label="Business name" htmlFor="name">
            <Input id="name" name="name" defaultValue={initial.name} required />
          </Field>
          <Field label="Tagline" htmlFor="tagline" help="One line that sells it. Shows in listings.">
            <Input id="tagline" name="tagline" defaultValue={initial.tagline ?? ""} maxLength={160} />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={initial.description ?? ""} maxLength={3000} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="primaryCategoryId">
              <Select id="primaryCategoryId" name="primaryCategoryId" defaultValue={initial.primaryCategoryId ?? ""}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Price level" htmlFor="priceRange">
              <Select id="priceRange" name="priceRange" defaultValue={String(initial.priceRange ?? 0)}>
                <option value="0">Not set</option>
                <option value="1">Rs — budget</option>
                <option value="2">Rs Rs — moderate</option>
                <option value="3">Rs Rs Rs — upmarket</option>
                <option value="4">Rs Rs Rs Rs — premium</option>
              </Select>
            </Field>
          </div>
        </section>

        <section className="surface p-5 space-y-4">
          <h2 className="font-semibold">Location & contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="cityId">
              <Select id="cityId" value={cityId} onChange={(e) => setCityId(e.target.value)}>
                <option value="">—</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Area" htmlFor="areaId">
              <Select id="areaId" name="areaId" defaultValue={initial.areaId ?? ""} key={cityId}>
                <option value="">—</option>
                {cityAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Address" htmlFor="address">
            <Input id="address" name="address" defaultValue={initial.address ?? ""} maxLength={300} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={initial.phone ?? ""} inputMode="tel" />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp">
              <Input id="whatsapp" name="whatsapp" defaultValue={initial.whatsapp ?? ""} inputMode="tel" />
            </Field>
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" defaultValue={initial.email ?? ""} type="email" />
            </Field>
            <Field label="Website" htmlFor="website">
              <Input id="website" name="website" defaultValue={initial.website ?? ""} />
            </Field>
            <Field label="Facebook" htmlFor="facebook">
              <Input id="facebook" name="facebook" defaultValue={initial.facebook ?? ""} placeholder="https://facebook.com/…" />
            </Field>
            <Field label="Instagram" htmlFor="instagram">
              <Input id="instagram" name="instagram" defaultValue={initial.instagram ?? ""} placeholder="https://instagram.com/…" />
            </Field>
          </div>
        </section>

        <section className="surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Opening hours</h2>
            <button type="button" onClick={copyMondayToAll} className="text-sm font-medium text-brand-700 dark:text-brand-300">
              Copy Monday to all days
            </button>
          </div>
          <div className="space-y-2">
            {hours.map((h, i) => (
              <div key={h.dayOfWeek} className="grid grid-cols-[6rem_1fr_1fr_auto] items-center gap-2 text-sm">
                <span className="text-2">{DAYS[h.dayOfWeek]}</span>
                <Input type="time" value={h.opens ?? ""} disabled={h.isClosed} onChange={(e) => setHours(hours.map((x, j) => (j === i ? { ...x, opens: e.target.value } : x)))} className="h-9 text-sm tabular" />
                <Input type="time" value={h.closes ?? ""} disabled={h.isClosed} onChange={(e) => setHours(hours.map((x, j) => (j === i ? { ...x, closes: e.target.value } : x)))} className="h-9 text-sm tabular" />
                <label className="inline-flex items-center gap-1.5 text-xs text-2">
                  <input type="checkbox" checked={h.isClosed} onChange={(e) => setHours(hours.map((x, j) => (j === i ? { ...x, isClosed: e.target.checked } : x)))} className="accent-brand-700" /> Closed
                </label>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-3">For 24-hour businesses set 00:00 to 23:59. Closing after midnight (e.g. 01:00) is handled correctly.</p>
        </section>

        <section className="surface p-5">
          <h2 className="mb-3 font-semibold">Services & prices</h2>
          <div className="space-y-2">
            {services.map((s, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1.2fr_1.5fr_7rem_auto]">
                <Input placeholder="Service" value={s.name} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="h-9 text-sm" />
                <Input placeholder="Short description" value={s.description ?? ""} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} className="h-9 text-sm" />
                <Input placeholder="From Rs" type="number" value={s.priceFrom ?? ""} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, priceFrom: e.target.value ? Number(e.target.value) : undefined } : x)))} className="h-9 text-sm tabular" />
                <Button type="button" variant="ghost" size="sm" onClick={() => setServices(services.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setServices([...services, { name: "" }])}>
              + Add service
            </Button>
          </div>
        </section>

        <section className="surface p-5 space-y-5">
          <h2 className="font-semibold">Images</h2>
          <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
            <div>
              <p className="mb-1.5 text-[13px] font-semibold">Logo</p>
              <ImageUpload value={logoUrl} onChange={setLogoUrl} variant="logo" businessId={initial.id} label="Upload logo" aspect="1/1" />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold">Cover image</p>
              <ImageUpload value={coverUrl} onChange={setCoverUrl} variant="cover" businessId={initial.id} label="Upload cover" aspect="21/9" />
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Photos</p>
            <ImageGalleryUpload value={photos} onChange={setPhotos} businessId={initial.id} />
          </div>
        </section>
      </div>

      <aside className="self-start space-y-3 lg:sticky lg:top-24">
        {entities.length ? (
          <div className="border border-line p-4">
            <p className="mb-2 text-[13px] font-semibold">Topics (brands, regulators)</p>
            <div className="flex flex-wrap gap-1.5">
              {entities.map((e) => {
                const on = entitySlugs.includes(e.slug);
                return (
                  <button key={e.slug} type="button" aria-pressed={on} onClick={() => setEntitySlugs(on ? entitySlugs.filter((s) => s !== e.slug) : [...entitySlugs, e.slug])} className={cn("border px-2 py-0.5 text-xs", on ? "border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-ink-900" : "border-line text-2 hover:bg-surface-2")}>
                    {e.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="surface p-4 space-y-3">
          <Button type="button" onClick={submit} disabled={busy} className="w-full">
            {busy ? "Saving…" : "Save changes"}
          </Button>
          {msg ? <p className={cn("text-sm", msg.ok ? "text-emerald-700" : "text-red-600")}>{msg.text}</p> : null}
          <p className="text-xs text-3">Changes go live immediately and update search.</p>
        </div>
      </aside>
    </form>
  );
}
