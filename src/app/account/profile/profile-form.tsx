"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { ImageUpload } from "@/components/image-upload";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { saveMemberProfile } from "@/lib/community-actions";
import type { MemberFormInput } from "@/lib/community-schema";

export function ProfileForm({ initial, cities }: { initial: Partial<MemberFormInput>; cities: { id: string; name: string }[] }) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = React.useState(initial.avatarUrl ?? "");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(formRef.current!);
        const get = (k: string) => String(fd.get(k) ?? "").trim();
        setBusy(true);
        setMsg("");
        const res = await saveMemberProfile({ handle: get("handle"), displayName: get("displayName"), bio: get("bio") || undefined, avatarUrl: avatarUrl || undefined, cityId: get("cityId") || undefined, website: get("website") || undefined, linkedin: get("linkedin") || undefined, x: get("x") || undefined, instagram: get("instagram") || undefined, facebook: get("facebook") || undefined, github: get("github") || undefined, isPublic: fd.get("isPublic") === "on" });
        setBusy(false);
        setMsg(res.ok ? "Saved." : res.error ?? "Could not save");
        if (res.ok) router.refresh();
      }}
      className="grid gap-8 md:grid-cols-[minmax(0,1fr)_220px]"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display name" htmlFor="displayName">
            <Input id="displayName" name="displayName" defaultValue={initial.displayName} required minLength={2} maxLength={80} />
          </Field>
          <Field label="Handle" htmlFor="handle" help="Your public address: searchable.pk/u/handle">
            <Input id="handle" name="handle" defaultValue={initial.handle} required pattern="[a-z0-9][a-z0-9_.\-]{2,29}" maxLength={30} />
          </Field>
        </div>
        <Field label="About you" htmlFor="bio" help="Up to 600 characters.">
          <Textarea id="bio" name="bio" defaultValue={initial.bio} maxLength={600} className="min-h-24" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="cityId">
            <Select id="cityId" name="cityId" defaultValue={initial.cityId ?? ""}>
              <option value="">Not said</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Website" htmlFor="website">
            <Input id="website" name="website" defaultValue={initial.website} maxLength={200} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["linkedin", "x", "instagram", "facebook", "github"] as const).map((k) => (
            <Field key={k} label={k === "x" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)} htmlFor={k}>
              <Input id={k} name={k} defaultValue={initial[k]} maxLength={200} placeholder="handle" />
            </Field>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="isPublic" defaultChecked={initial.isPublic ?? true} className="accent-ink-900" /> Show my profile page publicly
        </label>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          {msg ? <span className="text-[13.5px] text-2">{msg}</span> : null}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-semibold">Photo</p>
        <ImageUpload variant="avatar" value={avatarUrl} onChange={setAvatarUrl} label="Upload a photo" aspect="1/1" />
      </div>
    </form>
  );
}
