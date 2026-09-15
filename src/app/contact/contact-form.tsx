"use client";

import * as React from "react";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { sendContact } from "./actions";

export function ContactForm({ about }: { about?: string }) {
  const [state, setState] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    const fd = new FormData(e.currentTarget);
    const res = await sendContact({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      subject: String(fd.get("subject") ?? ""),
      message: String(fd.get("message") ?? ""),
      about,
    });
    if (res.ok) setState("done");
    else {
      setError(res.error ?? "Could not send");
      setState("error");
    }
  }

  if (state === "done") return <p className="border border-brand-200 bg-brand-50 px-4 py-3 text-[15px] dark:border-brand-800 dark:bg-brand-950/40">Thanks: your message is in. We reply to everything that needs a reply.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {about ? <p className="rounded-xl bg-surface-2 px-3.5 py-2 text-sm text-2">About: {about}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name">
          <Input id="c-name" name="name" required maxLength={80} />
        </Field>
        <Field label="Email" htmlFor="c-email">
          <Input id="c-email" name="email" type="email" required />
        </Field>
      </div>
      <Field label="Subject" htmlFor="c-subject">
        <Input id="c-subject" name="subject" required maxLength={120} placeholder="Error in a calculator, suggest a guide, listing issue…" />
      </Field>
      <Field label="Message" htmlFor="c-message">
        <Textarea id="c-message" name="message" required minLength={10} maxLength={4000} />
      </Field>
      <Button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Sending…" : "Send message"}
      </Button>
      {state === "error" ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
