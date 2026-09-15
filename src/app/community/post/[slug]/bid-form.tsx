"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button, Input } from "@/components/ui";
import { hasAuthHint } from "@/lib/auth-hint";
import { placeBid } from "@/lib/community-actions";

const subscribeNoop = () => () => {};

export function BidForm({ postId, minimum, path }: { postId: string; minimum: number; path: string }) {
  const router = useRouter();
  const mounted = React.useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [amount, setAmount] = React.useState(String(minimum));
  const [msg, setMsg] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  if (!mounted) return null;
  if (!hasAuthHint()) {
    return (
      <p className="text-[14px] text-2">
        <Link href={`/login?next=${encodeURIComponent(path)}`} className="font-medium text-[var(--text)] underline underline-offset-4">
          Sign in
        </Link>{" "}
        to bid.
      </p>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg("");
        const res = await placeBid(postId, Number(amount));
        setBusy(false);
        if (!res.ok) {
          setMsg(res.error ?? "Could not bid");
          return;
        }
        setMsg(`Your bid of Rs ${Number(amount).toLocaleString()} is the highest.`);
        router.refresh();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <Input type="number" min={minimum} step={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-40 tabular" aria-label="Bid amount in rupees" />
      <Button type="submit" disabled={busy}>
        {busy ? "Bidding…" : "Place bid"}
      </Button>
      {msg ? <span className="text-[13.5px] text-2">{msg}</span> : null}
    </form>
  );
}
