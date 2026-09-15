"use client";

import * as React from "react";
import { Button, Textarea } from "@/components/ui";
import { respondToReview } from "@/lib/business-actions";
import { respondToProfessionalReview } from "@/lib/review-actions";

export function ReviewResponseForm({ reviewId, initial, kind = "business" }: { reviewId: string; initial: string; kind?: "business" | "professional" }) {
  const [text, setText] = React.useState(initial);
  const [state, setState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setState("saving");
        const res = kind === "professional" ? await respondToProfessionalReview(reviewId, text) : await respondToReview(reviewId, text);
        setState(res.ok ? "saved" : "error");
      }}
      className="space-y-2"
    >
      <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Thank the reviewer, address the issue, invite them back." className="min-h-20 text-sm" />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : initial ? "Update response" : "Post response"}
        </Button>
        {state === "saved" ? <span className="text-sm text-2">Published on your {kind === "professional" ? "profile" : "listing"}.</span> : null}
        {state === "error" ? <span className="text-sm text-red-600">Could not save.</span> : null}
      </div>
    </form>
  );
}
