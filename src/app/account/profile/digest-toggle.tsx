"use client";

import * as React from "react";
import { setDigestPreference } from "@/lib/saved-actions";

/** One switch for the daily activity email. */
export function DigestToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  return (
    <label className="mb-8 flex items-start gap-3 border-y border-line py-3 text-[14.5px]">
      <input
        type="checkbox"
        checked={on}
        disabled={busy}
        onChange={async (e) => {
          const next = e.target.checked;
          setOn(next);
          setBusy(true);
          const res = await setDigestPreference(next);
          if (!res.ok) setOn(!next);
          setBusy(false);
        }}
        className="mt-1 accent-ink-900"
      />
      <span>
        <span className="font-medium">Daily activity email</span>
        <span className="block text-2">One email a day, only when something happened: comments and replies on your posts, likes, bids on your auctions. Enquiries and outbid alerts always arrive at once.</span>
      </span>
    </label>
  );
}
