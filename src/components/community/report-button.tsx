"use client";

import { Flag } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui";
import { reportContent } from "@/lib/community-actions";

/** Report a post or member. Anyone can, signed in or not; rate limited on the server. */
export function ReportButton({ targetType, targetId }: { targetType: "post" | "member"; targetId: string }) {
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState("");
  return (
    <div className="text-[13.5px]">
      {done ? (
        <span className="text-2">{done}</span>
      ) : open ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const res = await reportContent({ targetType, targetId, reason: String(fd.get("reason")) as "spam", details: String(fd.get("details") ?? "") });
            setDone(res.ok ? "Reported, thank you. An editor will look." : res.error ?? "Could not send");
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <select name="reason" className="h-8 border border-line bg-surface px-2 text-[13px]">
            <option value="scam">Scam or fraud</option>
            <option value="spam">Spam</option>
            <option value="abuse">Abuse</option>
            <option value="wrong">Wrong or misleading</option>
            <option value="other">Other</option>
          </select>
          <input name="details" placeholder="Details (optional)" maxLength={600} className="h-8 w-48 border border-line bg-surface px-2 text-[13px]" />
          <Button type="submit" size="sm" variant="outline">
            Send
          </Button>
          <button type="button" onClick={() => setOpen(false)} className="text-2 underline-offset-4 hover:underline">
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-2 hover:text-[var(--text)]">
          <Flag className="size-3.5" /> Report
        </button>
      )}
    </div>
  );
}
