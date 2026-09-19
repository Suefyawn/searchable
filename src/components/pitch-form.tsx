"use client";

import Link from "next/link";
import * as React from "react";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { submitPitchAction } from "@/lib/commerce-actions";
import { Turnstile } from "@/components/turnstile";

const KINDS = [
  { value: "guest", label: "Guest article (free, editorial)" },
  { value: "sponsored", label: "Sponsored article (paid, dofollow links)" },
  { value: "press_release", label: "Press release (paid)" },
];

export function PitchForm({ initialKind = "guest", categories }: { initialKind?: string; categories: { slug: string; name: string }[] }) {
  const [kind, setKind] = React.useState(KINDS.some((k) => k.value === initialKind) ? initialKind : "guest");
  const [state, setState] = React.useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{ invoiceNo?: string; invoicePath?: string } | null>(null);
  const [words, setWords] = React.useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("saving");
    setError("");
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const r = await submitPitchAction(raw);
    if (r.ok) {
      setResult({ invoiceNo: r.invoiceNo, invoicePath: r.invoicePath });
      setState("done");
    } else {
      setError(r.error);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <Alert tone="success" title="Received">
        {result?.invoiceNo ? (
          <>
            Your invoice is <strong>{result.invoiceNo}</strong>. Payment details and status are on{" "}
            <Link href={result.invoicePath ?? `/orders/${result.invoiceNo}`} className="underline underline-offset-4">
              your invoice page
            </Link>
            ; editing starts once payment is confirmed.
          </>
        ) : (
          "An editor reads every pitch within 5 working days and replies either way."
        )}
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label="What are you submitting?">
        <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <Input name="name" required maxLength={80} />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required maxLength={120} />
        </Field>
        <Field label="Phone / WhatsApp (optional)">
          <Input name="phone" maxLength={30} />
        </Field>
        <Field label={kind === "guest" ? "Organisation (optional)" : "Company"}>
          <Input name="company" maxLength={120} required={kind !== "guest"} />
        </Field>
      </div>
      <Field label="Website (optional)">
        <Input name="website" placeholder="https://" maxLength={200} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label="Proposed headline" help="Specific and useful, e.g. “How to claim input tax as a small retailer in 2026”">
          <Input name="title" required minLength={8} maxLength={160} />
        </Field>
        <Field label="Section">
          <Select name="category" defaultValue="">
            <option value="">Editor decides</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={kind === "guest" ? "Pitch or full draft (Markdown)" : "Draft (Markdown)"} help={`${words} words · ${kind === "guest" ? "A 150-word pitch is enough; full drafts of 800–1,500 words get published faster." : "800–1,500 words. We edit for clarity and accuracy; you approve before publication."}`}>
        <Textarea name="body" required minLength={200} maxLength={20_000} className="min-h-72" onChange={(e) => setWords(e.target.value.trim().split(/\s+/).filter(Boolean).length)} />
      </Field>
      <Field label="Links you want included (one per line)" help={kind === "guest" ? "Guest articles may link to sources; a single link to your organisation goes in the byline (nofollow)." : "Up to 2 links to your site (sponsored article) or 1 (press release), marked rel=sponsored."}>
        <Textarea name="links" className="min-h-20" placeholder="https://" />
      </Field>
      {/* honeypot */}
      <div className="hidden" aria-hidden>
        <label>
          Company URL
          <input name="company_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="text-sm text-2">
        By submitting you confirm the text is your own, not published elsewhere, and that you accept our <Link href="/editorial-policy" className="underline underline-offset-4">editorial policy</Link>. Paid submissions are invoiced immediately and refunded in full if we decline the topic.
      </p>
      <Turnstile />
      <Button type="submit" disabled={state === "saving"}>
        {state === "saving" ? "Sending…" : kind === "guest" ? "Send pitch" : "Submit and get invoice"}
      </Button>
    </form>
  );
}
