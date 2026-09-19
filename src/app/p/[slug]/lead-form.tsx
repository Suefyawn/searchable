"use client";

import * as React from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { sendProfessionalLead } from "@/lib/professional-actions";
import { Turnstile, turnstileToken } from "@/components/turnstile";

export function ProLeadForm({ professionalId, name }: { professionalId: string; name: string }) {
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    const fd = new FormData(e.currentTarget);
    const res = await sendProfessionalLead({ professionalId, name: String(fd.get("name") ?? ""), phone: String(fd.get("phone") ?? ""), email: String(fd.get("email") ?? ""), message: String(fd.get("message") ?? ""), website: String(fd.get("website") ?? ""), turnstile: turnstileToken(fd) });
    if (res.ok) setState("done");
    else {
      setError(res.error ?? "Could not send");
      setState("error");
    }
  }

  if (state === "done") return <p className="border-y-2 border-[var(--rule)] py-3 text-[15px]">Sent. {name} will contact you on the number you gave.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      <Input name="name" placeholder="Your name" required maxLength={80} />
      <Input name="phone" placeholder="Phone or WhatsApp" required maxLength={20} inputMode="tel" />
      <Input name="email" type="email" placeholder="Email (optional)" maxLength={120} />
      <Textarea name="message" placeholder="What do you need, and when?" maxLength={1000} className="min-h-24" />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Turnstile />
      <Button type="submit" disabled={state === "loading"} className="w-full">
        {state === "loading" ? "Sending…" : "Send enquiry"}
      </Button>
      {state === "error" ? <p className="text-sm">{error}</p> : null}
    </form>
  );
}
