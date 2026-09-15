"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/upload";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { confirmCodeAction, startClaimAction, type ClaimActionState } from "./actions";

type Method = "invite" | "email_domain" | "phone" | "document";

export type ClaimFormProps = {
  business: { id: string; slug: string; name: string; phone: string | null; whatsapp: string | null; website: string | null; domain: string | null; email: string | null };
  user: { name: string; email: string };
  inviteToken?: string;
  inviteEmailMatches: boolean;
  contact: { whatsapp: string; email: string };
};

const METHODS: { key: Method; title: string; body: string; instant: boolean }[] = [
  { key: "invite", title: "Use the link we emailed you", body: "You opened this page from the invitation we sent to the address on the listing. That is proof enough.", instant: true },
  { key: "email_domain", title: "Code to your website's email", body: "We send a six-digit code to any mailbox on your website's domain. Enter it here and the listing is yours immediately.", instant: true },
  { key: "phone", title: "Message us from the listed number", body: "We give you a code. Send it to us on WhatsApp or SMS from the phone number on the listing, or ask us to call it. An editor confirms within one working day.", instant: false },
  { key: "document", title: "Upload a document", body: "An NTN or business registration certificate, a utility bill, letterhead or a photo of the signboard with the business name. Reviewed within two working days.", instant: false },
];

export function ClaimForm(props: ClaimFormProps) {
  const router = useRouter();
  const available = METHODS.filter((m) => (m.key === "invite" ? !!props.inviteToken && props.inviteEmailMatches : m.key === "email_domain" ? !!props.business.domain : m.key === "phone" ? !!(props.business.phone || props.business.whatsapp) : true));
  const [method, setMethod] = React.useState<Method>(available[0]?.key ?? "document");
  const [evidenceUrl, setEvidenceUrl] = React.useState("");
  const [state, formAction, pending] = React.useActionState<ClaimActionState, FormData>(startClaimAction, {});

  // The server page renders the next step (code entry, waiting, approved) from the claim row.
  React.useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  if (state.ok) return <p className="text-[15px] text-2">Claim received…</p>;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="businessId" value={props.business.id} />
      <input type="hidden" name="slug" value={props.business.slug} />
      <input type="hidden" name="method" value={method} />
      {props.inviteToken ? <input type="hidden" name="inviteToken" value={props.inviteToken} /> : null}
      {evidenceUrl ? <input type="hidden" name="evidenceUrl" value={evidenceUrl} /> : null}

      <fieldset>
        <legend className="eyebrow mb-2">1. How will you prove it?</legend>
        <div className="divide-y divide-[var(--border)] border-y border-line">
          {available.map((m) => (
            <label key={m.key} className={cn("flex cursor-pointer gap-3 py-3", method === m.key ? "" : "text-2")}>
              <input type="radio" name="_method" value={m.key} checked={method === m.key} onChange={() => setMethod(m.key)} className="mt-1.5 accent-ink-900" />
              <span>
                <span className="flex flex-wrap items-baseline gap-2 font-medium text-[var(--text)]">
                  {m.title}
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-3">{m.instant ? "Instant" : "Editor checks"}</span>
                </span>
                <span className="mt-0.5 block text-[14px] leading-relaxed">{m.body}</span>
              </span>
            </label>
          ))}
        </div>
        {method === "email_domain" ? (
          <div className="mt-3 flex items-end gap-2">
            <Field label="Mailbox on your domain" htmlFor="mailbox" className="flex-1">
              <Input id="mailbox" name="mailbox" required placeholder="info" pattern="[A-Za-z0-9._+\-]+" />
            </Field>
            <p className="pb-2.5 text-[15px] text-2">@{props.business.domain}</p>
          </div>
        ) : null}
        {method === "document" ? (
          <div className="mt-3">
            <ImageUpload variant="evidence" value={evidenceUrl} onChange={setEvidenceUrl} label="Upload the document" aspect="4/3" className="max-w-sm" />
            <p className="mt-1.5 text-[13px] text-3">Cover account numbers if you like; we only need the business name and address to be readable. Documents are seen by editors only.</p>
          </div>
        ) : null}
        {method === "phone" ? <p className="mt-3 text-[14px] text-2">After you submit we show a code. Send it from {props.business.whatsapp ?? props.business.phone} to {props.contact.whatsapp} on WhatsApp or SMS.</p> : null}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="eyebrow mb-2">2. About you</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="contactName">
            <Input id="contactName" name="contactName" required minLength={2} maxLength={120} defaultValue={props.user.name} />
          </Field>
          <Field label="Your role" htmlFor="role">
            <Select id="role" name="role" defaultValue="owner">
              <option value="owner">Owner or partner</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff, on the owner&rsquo;s behalf</option>
            </Select>
          </Field>
          <Field label="Phone we can reach you on" htmlFor="contactPhone" help="Used only if we need to check something.">
            <Input id="contactPhone" name="contactPhone" type="tel" maxLength={40} placeholder="03xx xxxxxxx" />
          </Field>
          <Field label="Email for updates" htmlFor="contactEmail">
            <Input id="contactEmail" name="contactEmail" type="email" maxLength={200} defaultValue={props.user.email} />
          </Field>
        </div>
        <Field label="Anything we should know" htmlFor="message" help="Optional. Wrong phone number, moved premises, new name, and so on.">
          <Textarea id="message" name="message" maxLength={1000} className="min-h-24" />
        </Field>
      </fieldset>

      <label className="flex gap-3 text-[14px] leading-relaxed text-2">
        <input type="checkbox" name="declaration" required className="mt-1 accent-ink-900" />
        <span>I confirm I am authorised to manage this listing, the details I give are true, and I understand a false claim will be removed and the account closed.</span>
      </label>

      {state.error ? <p className="border-l-2 border-[var(--text)] pl-3 text-[15px]">{state.error}</p> : null}
      <Button type="submit" disabled={pending || (method === "document" && !evidenceUrl)}>
        {pending ? "Sending…" : method === "email_domain" ? "Send the code" : method === "invite" ? "Claim this listing" : "Submit claim"}
      </Button>
    </form>
  );
}

/** Step two for email_domain: type the code. */
export function CodeEntry({ slug, claimId, sentTo }: { slug: string; claimId: string; sentTo: string }) {
  const router = useRouter();
  const [state, formAction, pending] = React.useActionState<ClaimActionState, FormData>(confirmCodeAction, {});
  React.useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="claimId" value={claimId} />
      <p className="text-[15px] text-2">
        We sent a six-digit code to <strong className="text-[var(--text)]">{sentTo}</strong>. It is valid for 24 hours and five attempts.
      </p>
      <Field label="Code" htmlFor="code">
        <Input id="code" name="code" inputMode="numeric" pattern="[0-9 ]{6,7}" required autoComplete="one-time-code" className="max-w-40 text-lg tracking-[0.3em]" />
      </Field>
      {state.error ? <p className="border-l-2 border-[var(--text)] pl-3 text-[15px]">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Checking…" : "Confirm"}
      </Button>
    </form>
  );
}
