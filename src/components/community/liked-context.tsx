"use client";

import * as React from "react";
import { hasAuthHint } from "@/lib/auth-hint";

/**
 * One request per page for the signed-in reader's likes, shared by every LikeButton below it. Anonymous
 * readers (the vast majority, on cached pages) make no request at all.
 */
type Ctx = { liked: Set<string>; ready: boolean; setLiked: (key: string, on: boolean) => void };
const LikedContext = React.createContext<Ctx>({ liked: new Set(), ready: false, setLiked: () => {} });

export function LikedProvider({ targets, children }: { targets: { type: "post" | "comment" | "article"; id: string }[]; children: React.ReactNode }) {
  const [liked, setLikedState] = React.useState<Set<string>>(new Set());
  const [ready, setReady] = React.useState(false);
  const key = targets.map((t) => `${t.type}:${t.id}`).join(",");
  React.useEffect(() => {
    if (!hasAuthHint() || !key) {
      return;
    }
    let alive = true;
    fetch(`/api/community/liked?t=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : { liked: [] }))
      .then((d: { liked: string[] }) => {
        if (!alive) return;
        setLikedState(new Set(d.liked));
        setReady(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key]);
  const setLiked = React.useCallback((k: string, on: boolean) => {
    setLikedState((prev) => {
      const next = new Set(prev);
      if (on) next.add(k);
      else next.delete(k);
      return next;
    });
  }, []);
  return <LikedContext.Provider value={{ liked, ready, setLiked }}>{children}</LikedContext.Provider>;
}

export function useLiked() {
  return React.useContext(LikedContext);
}
