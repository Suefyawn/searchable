"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Textarea } from "@/components/ui";
import { replyAction, type ReplyState } from "../actions";

/** Plain-text reply box. The server threads it under the original and sends from the same mailbox. */
export function ReplyForm({ id, to, from }: { id: string; to: string; from: string }) {
  const router = useRouter();
  const [state, formAction, pending] = React.useActionState<ReplyState, FormData>(replyAction, {});
  React.useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
  if (state.ok)
    return (
      <p className="border-t border-line pt-4 text-[15px] text-2">
        Reply sent to {to} from {from}.
      </p>
    );
  return (
    <form action={formAction} className="border-t border-line pt-4">
      <input type="hidden" name="id" value={id} />
      <p className="mb-2 text-[13.5px] text-2">
        Reply to <span className="text-[var(--text)]">{to}</span> from <span className="text-[var(--text)]">{from}</span>. Your name and the original message are added below it.
      </p>
      <Textarea name="body" rows={7} required minLength={2} placeholder="Write your reply" aria-label="Reply" />
      {state.error ? <p className="mt-2 border-l-2 border-[var(--text)] pl-3 text-[14px]">{state.error}</p> : null}
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
