"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui";
export type Result = { ok?: boolean; error?: string; message?: string };

type Action = (prev: Result, formData: FormData) => Promise<Result>;

/**
 * A form around one admin user action: pending state on the button, the server's error or confirmation
 * under it, an optional browser confirm for the destructive ones, and a refresh when the action succeeds.
 */
export function ActionForm({ action, children, submit, pendingLabel, confirm: confirmText, variant = "primary", size = "md", className, inline }: { action: Action; children?: React.ReactNode; submit: string; pendingLabel?: string; confirm?: string; variant?: "primary" | "outline" | "ghost" | "danger"; size?: "sm" | "md"; className?: string; inline?: boolean }) {
  const router = useRouter();
  const [state, formAction, pending] = React.useActionState<Result, FormData>(action, {});
  React.useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {children}
      <div className={inline ? "flex items-center gap-3" : "mt-3 flex flex-wrap items-center gap-3"}>
        <Button type="submit" disabled={pending} variant={variant} size={size}>
          {pending ? (pendingLabel ?? submit) : submit}
        </Button>
        {state.error ? <p className="border-l-2 border-[var(--text)] pl-2 text-[13.5px]">{state.error}</p> : null}
        {state.ok && state.message ? <p className="text-[13.5px] text-2">{state.message}</p> : null}
      </div>
    </form>
  );
}
