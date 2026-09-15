"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { ImageUpload } from "@/components/image-upload";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { savePost } from "@/lib/community-actions";
import { EMPLOYMENT_TYPES, POST_KINDS, type PostFormValues, type PostKindKey } from "@/lib/community-schema";
import { cn } from "@/lib/utils";

type Opt = { id: string; name: string };

/** Create or edit a post. The kind picks which fields show; the server validates per kind. */
export function PostForm({ initial, cities, isEditor }: { initial: Partial<PostFormValues>; cities: Opt[]; isEditor: boolean }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<PostKindKey>(initial.kind ?? "discussion");
  const [images, setImages] = React.useState<{ url: string; alt?: string }[]>(initial.images ?? []);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);
  const editing = !!initial.id;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const num = (k: string) => (get(k) ? Number(get(k)) : undefined);
    setBusy(true);
    setMsg("");
    const res = await savePost({
      id: initial.id,
      kind,
      title: get("title"),
      body: get("body"),
      topic: get("topic") || undefined,
      cityId: get("cityId") || undefined,
      images,
      company: get("company") || undefined,
      employmentType: (get("employmentType") || undefined) as (typeof EMPLOYMENT_TYPES)[number] | undefined,
      salaryMin: num("salaryMin"),
      salaryMax: num("salaryMax"),
      applyUrl: get("applyUrl") || undefined,
      deadline: get("deadline") || undefined,
      price: num("price"),
      condition: (get("condition") || undefined) as "new" | "used" | undefined,
      negotiable: fd.get("negotiable") === "on",
      startPrice: num("startPrice"),
      minIncrement: num("minIncrement"),
      endsAt: get("endsAt") ? new Date(get("endsAt")).toISOString() : undefined,
      location: get("location") || undefined,
      contactPhone: get("contactPhone") || undefined,
      contactWhatsapp: get("contactWhatsapp") || undefined,
      contactEmail: get("contactEmail") || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error ?? "Could not save");
      return;
    }
    router.push(editing || isEditor ? `/community/post/${res.slug}` : "/account/posts?submitted=1");
  }

  const k = POST_KINDS.find((x) => x.key === kind)!;

  return (
    <form ref={formRef} onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        {!editing ? (
          <fieldset>
            <legend className="eyebrow mb-2">What are you posting?</legend>
            <div className="grid gap-2 sm:grid-cols-5">
              {POST_KINDS.map((x) => (
                <button key={x.key} type="button" onClick={() => setKind(x.key)} className={cn("border px-3 py-2.5 text-left", kind === x.key ? "border-[var(--text)]" : "border-line hover:border-ink-500")}>
                  <span className="block font-medium">{x.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-3">{x.blurb}</span>
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        <Field label="Title" htmlFor="title" help={kind === "job" ? "Role and place: “Accountant, Lahore, 3 years experience”." : kind === "listing" ? "What it is, model and condition: “Honda City 2019, 42,000 km, Karachi”." : kind === "auction" ? "What is on offer and when it ends." : "Say what it is about in one line."}>
          <Input id="title" name="title" defaultValue={initial.title} required minLength={8} maxLength={140} />
        </Field>

        {kind === "job" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Employer" htmlFor="company">
              <Input id="company" name="company" defaultValue={initial.company} required maxLength={120} />
            </Field>
            <Field label="Type" htmlFor="employmentType">
              <Select id="employmentType" name="employmentType" defaultValue={initial.employmentType ?? ""}>
                <option value="">Not said</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Salary from (Rs / month)" htmlFor="salaryMin">
              <Input id="salaryMin" name="salaryMin" type="number" min={0} defaultValue={initial.salaryMin ?? ""} />
            </Field>
            <Field label="Salary to" htmlFor="salaryMax">
              <Input id="salaryMax" name="salaryMax" type="number" min={0} defaultValue={initial.salaryMax ?? ""} />
            </Field>
            <Field label="Apply link" htmlFor="applyUrl" help="Or give an email or phone below.">
              <Input id="applyUrl" name="applyUrl" defaultValue={initial.applyUrl} maxLength={300} placeholder="https://" />
            </Field>
            <Field label="Deadline" htmlFor="deadline">
              <Input id="deadline" name="deadline" type="date" defaultValue={initial.deadline} />
            </Field>
          </div>
        ) : null}

        {kind === "listing" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Price (Rs)" htmlFor="price" help="0 for free.">
              <Input id="price" name="price" type="number" min={0} defaultValue={initial.price ?? ""} required />
            </Field>
            <Field label="Condition" htmlFor="condition">
              <Select id="condition" name="condition" defaultValue={initial.condition ?? ""}>
                <option value="">Not said</option>
                <option value="new">New</option>
                <option value="used">Used</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-[14px]">
              <input type="checkbox" name="negotiable" defaultChecked={initial.negotiable} className="accent-ink-900" /> Price negotiable
            </label>
          </div>
        ) : null}

        {kind === "auction" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Starting price (Rs)" htmlFor="startPrice">
              <Input id="startPrice" name="startPrice" type="number" min={1} defaultValue={initial.startPrice ?? ""} required />
            </Field>
            <Field label="Minimum increment (Rs)" htmlFor="minIncrement">
              <Input id="minIncrement" name="minIncrement" type="number" min={1} defaultValue={initial.minIncrement ?? 500} />
            </Field>
            <Field label="Ends" htmlFor="endsAt" help="At least an hour from now, at most 30 days.">
              <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={initial.endsAt ? initial.endsAt.slice(0, 16) : ""} required />
            </Field>
          </div>
        ) : null}

        <Field label="Details" htmlFor="body" help="Plain text or Markdown. Be specific: numbers, places, dates. No phone numbers in the text; use the contact fields.">
          <Textarea id="body" name="body" defaultValue={initial.body} required minLength={20} maxLength={12000} className="min-h-48" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Topic" htmlFor="topic" help="One or two words: Cars, IT jobs, Furniture, Cricket.">
            <Input id="topic" name="topic" defaultValue={initial.topic} maxLength={40} />
          </Field>
          <Field label="City" htmlFor="cityId">
            <Select id="cityId" name="cityId" defaultValue={initial.cityId ?? ""}>
              <option value="">Anywhere / online</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Area or address" htmlFor="location">
            <Input id="location" name="location" defaultValue={initial.location} maxLength={160} />
          </Field>
        </div>

        {kind !== "question" && kind !== "discussion" ? (
          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="eyebrow mb-2">How to reach you</legend>
            <Field label="Phone" htmlFor="contactPhone">
              <Input id="contactPhone" name="contactPhone" defaultValue={initial.contactPhone} maxLength={20} inputMode="tel" />
            </Field>
            <Field label="WhatsApp" htmlFor="contactWhatsapp">
              <Input id="contactWhatsapp" name="contactWhatsapp" defaultValue={initial.contactWhatsapp} maxLength={20} inputMode="tel" />
            </Field>
            <Field label="Email" htmlFor="contactEmail">
              <Input id="contactEmail" name="contactEmail" type="email" defaultValue={initial.contactEmail} maxLength={120} />
            </Field>
          </fieldset>
        ) : null}
      </div>

      <aside className="space-y-6 self-start lg:sticky lg:top-24">
        <div className="space-y-3 border-y-2 border-[var(--rule)] py-4">
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Saving…" : editing ? "Save changes" : isEditor ? `Publish ${k.label.toLowerCase()}` : `Submit ${k.label.toLowerCase()} for review`}
          </Button>
          {msg ? <p className="text-[13.5px] font-medium">{msg}</p> : null}
          {!editing && !isEditor ? <p className="text-[12.5px] text-3">An editor checks every post before it appears, usually within a few hours. Scams, duplicates and anything illegal are rejected; everything else goes up.</p> : null}
        </div>
        <div>
          <p className="mb-1.5 text-[13px] font-semibold">Photos (up to 8)</p>
          <div className="grid grid-cols-2 gap-2">
            {images.map((im, i) => (
              <div key={im.url} className="relative">
                <ImageUpload variant="post" value={im.url} onChange={(url) => setImages(url ? images.map((x, j) => (j === i ? { ...x, url } : x)) : images.filter((_, j) => j !== i))} aspect="4/3" />
              </div>
            ))}
            {images.length < 8 ? <ImageUpload variant="post" value="" onChange={(url) => url && setImages([...images, { url }])} label="Add photo" aspect="4/3" /> : null}
          </div>
        </div>
      </aside>
    </form>
  );
}
