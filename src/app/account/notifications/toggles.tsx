"use client";

import * as React from "react";
import type { NotifyKind } from "@/lib/notify";
import { setNotificationPreference } from "@/lib/saved-actions";

type Item = { kind: NotifyKind; label: string; description: string; on: boolean };

/** One checkbox per email kind; saves on change, reverts on failure. */
export function NotificationToggles({ items }: { items: Item[] }) {
  const [state, setState] = React.useState<Record<string, boolean>>(Object.fromEntries(items.map((i) => [i.kind, i.on])));
  const [busy, setBusy] = React.useState<string | null>(null);
  return (
    <div className="divide-y divide-[var(--border)] border-y border-line">
      {items.map((i) => (
        <label key={i.kind} className="flex items-start gap-3 py-4 text-[15px]">
          <input
            type="checkbox"
            checked={state[i.kind]}
            disabled={busy === i.kind}
            onChange={async (e) => {
              const next = e.target.checked;
              setState((s) => ({ ...s, [i.kind]: next }));
              setBusy(i.kind);
              const res = await setNotificationPreference(i.kind, next);
              if (!res.ok) setState((s) => ({ ...s, [i.kind]: !next }));
              setBusy(null);
            }}
            className="mt-1 accent-ink-900"
          />
          <span>
            <span className="font-medium">{i.label}</span>
            <span className="block text-2">{i.description}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
