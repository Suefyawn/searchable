"use client";

import * as React from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { sendLead } from "./actions";

export function LeadForm({ businessId }: { businessId: string }) {
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    const fd = new FormData(e.currentTarget);
    const res = await sendLead({ businessId, name: String(fd.get("name") ?? ""), phone: String(fd.get("phone") ?? ""), message: String(fd.get("message") ?? "") });
    if (res.ok) setState("done");
    else {
      setError(res.error ?? "Could not send");
      setState("error");
    }
  }

  if (state === "done") return <p className="rounded-2xl bg-brand-50 px-5 py-4 text-[15px] dark:bg-brand-950/40">Sent. The business will contact you on the number you gave.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      <Input name="name" placeholder="Your name" required maxLength={80} />
      <Input name="phone" placeholder="Phone or WhatsApp" required maxLength={20} inputMode="tel" />
      <Textarea name="message" placeholder="What do you need?" required maxLength={1000} className="min-h-24" />
      <Button type="submit" disabled={state === "loading"} className="w-full">
        {state === "loading" ? "Sending…" : "Send enquiry"}
      </Button>
      {state === "error" ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
