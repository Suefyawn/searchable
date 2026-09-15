"use client";

import Link from "next/link";
import * as React from "react";

const subscribeNoop = () => () => {};
import { Button, Input, Textarea } from "@/components/ui";
import { useSession } from "@/lib/auth-client";
import { hasAuthHint } from "@/lib/auth-hint";
import { submitReview } from "@/lib/review-actions";
import { cn } from "@/lib/utils";

/** Business profile pages are the busiest public pages; anonymous readers must not trigger a session request. */
export function ReviewForm(props: { businessId: string; businessSlug: string }) {
  const mounted = React.useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!mounted) return null;
  if (!hasAuthHint()) return <SignInPrompt businessSlug={props.businessSlug} />;
  return <ReviewFormInner {...props} />;
}

function SignInPrompt({ businessSlug }: { businessSlug: string }) {
  return (
    <p className="text-[15px] text-2">
      <Link href={`/login?next=${encodeURIComponent(`/b/${businessSlug}#write-review`)}`} className="font-medium underline underline-offset-4">Sign in</Link> to write a review. Reviews are checked before they appear.
    </p>
  );
}

function ReviewFormInner({ businessId, businessSlug }: { businessId: string; businessSlug: string }) {
  const { data, isPending } = useSession();
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [state, setState] = React.useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = React.useState("");
  if (isPending) return null;
  if (!data?.user) return <SignInPrompt businessSlug={businessSlug} />;
  if (state === "done") return <p className="border border-brand-200 bg-brand-50 px-4 py-3 text-[15px] dark:border-brand-800 dark:bg-brand-950/40">Thank you. Your review is in the moderation queue and will appear once checked.</p>;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setState("saving");
        const res = await submitReview({ businessId, rating, title: String(fd.get("title") ?? "") || undefined, body: String(fd.get("body") ?? "") });
        if (res.ok) setState("done");
        else {
          setError(res.error ?? "Could not submit");
          setState("error");
        }
      }}
      className="space-y-3"
    >
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className={cn("text-2xl leading-none transition-colors", (hover || rating) >= n ? "text-accent-500" : "text-ink-300")}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-3">{["", "Poor", "Fair", "Good", "Very good", "Excellent"][hover || rating]}</span>
      </div>
      <Input name="title" placeholder="Summary (optional)" maxLength={120} />
      <Textarea name="body" required minLength={20} maxLength={2000} placeholder="What was good, what was not, and who it suits. At least 20 characters." className="min-h-24" />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={state === "saving" || !rating}>
          {state === "saving" ? "Submitting…" : "Submit review"}
        </Button>
        {state === "error" ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>
    </form>
  );
}
