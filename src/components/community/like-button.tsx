"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { hasAuthHint } from "@/lib/auth-hint";
import { toggleLike } from "@/lib/community-actions";
import { cn } from "@/lib/utils";
import { useLiked } from "./liked-context";

export function LikeButton({ type, id, count: initial, path, size = "md" }: { type: "post" | "comment" | "article"; id: string; count: number; path?: string; size?: "sm" | "md" }) {
  const router = useRouter();
  const { liked, setLiked } = useLiked();
  const key = `${type}:${id}`;
  const on = liked.has(key);
  const [count, setCount] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);

  async function click() {
    if (!hasAuthHint()) {
      router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (busy) return;
    setBusy(true);
    const next = !on;
    setLiked(key, next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    const res = await toggleLike(type, id, path);
    if (res.ok && typeof res.count === "number") setCount(res.count);
    if (!res.ok) {
      setLiked(key, !next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
    setBusy(false);
  }

  return (
    <button type="button" onClick={click} aria-pressed={on} className={cn("inline-flex items-center gap-1.5 text-2 hover:text-[var(--text)]", size === "sm" ? "text-[12.5px]" : "text-[13.5px]", on && "text-[var(--text)]")}>
      <Heart className={cn(size === "sm" ? "size-3.5" : "size-4", on && "fill-current")} />
      <span className="tabular">{count}</span>
      <span className="sr-only">{on ? "Unlike" : "Like"}</span>
    </button>
  );
}
