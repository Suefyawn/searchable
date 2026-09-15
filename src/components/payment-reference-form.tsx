"use client";

import * as React from "react";
import { Alert, Button, Input, Select } from "@/components/ui";
import { submitPaymentReferenceAction } from "@/lib/commerce-actions";

export function PaymentReferenceForm({ invoiceNo, existing }: { invoiceNo: string; existing: string | null }) {
  const [state, setState] = React.useState<"idle" | "saving" | "done">(existing ? "done" : "idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("saving");
    const r = await submitPaymentReferenceAction(new FormData(e.currentTarget));
    if (r.error) {
      setError(r.error);
      setState("idle");
    } else setState("done");
  }

  if (state === "done") return <Alert tone="success">Reference received{existing ? ` (${existing})` : ""}. We confirm payments within one working day and email you when the plan is active.</Alert>;

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 border border-line p-4">
      <input type="hidden" name="invoiceNo" value={invoiceNo} />
      {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
      <label className="text-xs text-3">
        Paid via
        <Select name="provider" defaultValue="manual" className="mt-1 h-9 w-40 text-sm">
          <option value="manual">Bank transfer</option>
          <option value="jazzcash">JazzCash</option>
          <option value="easypaisa">Easypaisa</option>
        </Select>
      </label>
      <label className="flex-1 text-xs text-3">
        Transaction ID
        <Input name="reference" required minLength={3} maxLength={120} className="mt-1 h-9 text-sm" placeholder="e.g. TID 1234567890" />
      </label>
      <Button size="sm" type="submit" disabled={state === "saving"}>
        {state === "saving" ? "Sending…" : "I have paid"}
      </Button>
    </form>
  );
}
