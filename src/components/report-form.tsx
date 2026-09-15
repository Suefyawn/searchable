"use client";

import * as React from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { submitReport } from "@/lib/report-actions";

const REASONS: Record<"business" | "review" | "article", { value: string; label: string }[]> = {
  business: [
    { value: "wrong_details", label: "Wrong phone, address or hours" },
    { value: "closed", label: "Permanently closed" },
    { value: "duplicate", label: "Duplicate listing" },
    { value: "inappropriate", label: "Inappropriate content" },
    { value: "other", label: "Something else" },
  ],
  review: [
    { value: "inappropriate", label: "Abusive or spam" },
    { value: "other", label: "Not a genuine review" },
  ],
  article: [
    { value: "factual_error", label: "Factual error" },
    { value: "other", label: "Something else" },
  ],
};

/** Collapsible "Report a problem" control. Used on business, review and article pages. */
export function ReportForm({ targetType, targetId, label = "Report a problem" }: { targetType: "business" | "review" | "article"; targetId: string; label?: string }) {
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = React.useState("");
  if (state === "done") return <p className="text-sm text-2">Thanks — we will check it.</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-3 underline underline-offset-4 hover:text-[var(--text)]">
        {label}
      </button>
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setState("saving");
        const res = await submitReport({ targetType, targetId, reason: String(fd.get("reason")) as "other", details: String(fd.get("details") ?? "") || undefined, email: String(fd.get("email") ?? "") || undefined });
        if (res.ok) setState("done");
        else {
          setError(res.error ?? "Could not send");
          setState("error");
        }
      }}
      className="space-y-2 border border-line p-4 text-sm"
    >
      <p className="font-semibold">{label}</p>
      <Select name="reason" required className="h-9 text-sm">
        {REASONS[targetType].map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </Select>
      <Textarea name="details" placeholder="What is wrong? (optional)" maxLength={1000} className="min-h-20 text-sm" />
      <Input name="email" type="email" placeholder="Your email (optional, if we need to follow up)" className="h-9 text-sm" />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={state === "saving"}>
          {state === "saving" ? "Sending…" : "Send report"}
        </Button>
        <button type="button" onClick={() => setOpen(false)} className="text-3 underline underline-offset-4">
          Cancel
        </button>
        {state === "error" ? <span className="text-rose-700">{error}</span> : null}
      </div>
    </form>
  );
}
