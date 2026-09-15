"use client";

import * as React from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { submitBusiness } from "./actions";

type Opt = { id: string; name: string };

export function AddBusinessForm({ categories, cities }: { categories: Opt[]; cities: Opt[] }) {
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    const res = await submitBusiness({
      name: get("name"),
      categoryId: get("categoryId"),
      cityId: get("cityId"),
      address: get("address"),
      phone: get("phone"),
      whatsapp: get("whatsapp") || undefined,
      website: get("website") || undefined,
      description: get("description"),
      contactName: get("contactName"),
      contactEmail: get("contactEmail"),
    });
    if (res.ok) setState("done");
    else {
      setError(res.error ?? "Could not submit");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-md bg-brand-50 px-4 py-4 text-[15px] dark:bg-brand-950/40">
        <p className="font-medium">Submitted — thank you.</p>
        <p className="mt-1 text-2">We will verify the details and publish the listing within two working days. You will get an email when it is live.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Business name" htmlFor="b-name">
        <Input id="b-name" name="name" required maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="b-cat">
          <Select id="b-cat" name="categoryId" required defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City" htmlFor="b-city">
          <Select id="b-city" name="cityId" required defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Address" htmlFor="b-address" help="Street, area and landmark — enough for a customer to find you.">
        <Input id="b-address" name="address" required maxLength={300} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="b-phone">
          <Input id="b-phone" name="phone" required inputMode="tel" maxLength={20} placeholder="042-1234567 or 0300-1234567" />
        </Field>
        <Field label="WhatsApp (optional)" htmlFor="b-wa">
          <Input id="b-wa" name="whatsapp" inputMode="tel" maxLength={20} placeholder="0300-1234567" />
        </Field>
      </div>
      <Field label="Website (optional)" htmlFor="b-web">
        <Input id="b-web" name="website" maxLength={200} placeholder="example.com" />
      </Field>
      <Field label="Description" htmlFor="b-desc" help="What you do, who you serve, what makes you worth calling. 20–2000 characters.">
        <Textarea id="b-desc" name="description" required minLength={20} maxLength={2000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="b-cname">
          <Input id="b-cname" name="contactName" required maxLength={80} />
        </Field>
        <Field label="Your email" htmlFor="b-cemail" help="For verification only; not shown publicly.">
          <Input id="b-cemail" name="contactEmail" type="email" required />
        </Field>
      </div>
      <Button type="submit" size="lg" disabled={state === "loading"}>
        {state === "loading" ? "Submitting…" : "Submit for review"}
      </Button>
      {state === "error" ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
