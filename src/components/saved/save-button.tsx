"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { hasAuthHint } from "@/lib/auth-hint";
import { toggleSaved, type SaveTarget } from "@/lib/saved-actions";
import { cn } from "@/lib/utils";

const subscribeNoop = () => () => {};

/**
 * Bookmark toggle for cached public pages. Anonymous readers see the button and get sent to sign in; signed-in
 * readers get one small request to learn the current state, then optimistic toggles.
 */
export function SaveButton({ target, className, label = "Save" }: { target: SaveTarget; className?: string; label?: string }) {
  const router = useRouter();
  const mounted = React.useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [saved, setSaved] = React.useState<boolean | null>(null);
  const [busy, setBusy] = React.useState(false);
  const key = `${target.targetType}:${target.targetId}`;

  React.useEffect(() => {
    if (!mounted || !hasAuthHint()) return;
    let alive = true;
    fetch(`/api/community/saved?t=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : { saved: [] }))
      .then((d: { saved: string[] }) => {
        if (alive) setSaved(d.saved.includes(key));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [mounted, key]);

  async function click() {
    if (!hasAuthHint()) {
      router.push(`/login?next=${encodeURIComponent(target.url)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    const res = await toggleSaved(target);
    if (!res.ok) setSaved(!next);
    else if (typeof res.saved === "boolean") setSaved(res.saved);
    setBusy(false);
  }

  return (
    <button type="button" onClick={click} aria-pressed={!!saved} className={cn("inline-flex items-center gap-1.5 text-[13.5px] text-2 hover:text-[var(--text)]", saved && "text-[var(--text)]", className)}>
      <Bookmark className={cn("size-4", saved && "fill-current")} />
      {saved ? "Saved" : label}
    </button>
  );
}
