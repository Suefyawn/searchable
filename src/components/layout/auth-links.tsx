"use client";

import Link from "next/link";
import * as React from "react";
import { hasAuthHint } from "@/lib/auth-hint";
import { useSession } from "@/lib/auth-client";

const subscribeNoop = () => () => {};
const EDITOR_ROLES = new Set(["editor", "admin"]);
const cls = "hidden sm:inline-flex h-9 items-center px-3 text-sm font-medium text-2 hover:bg-surface-2 hover:text-[var(--text)]";

/**
 * Session-aware header links. Client-side so public pages stay statically cacheable, and gated on the
 * sign-in hint cookie so anonymous visitors never trigger a session request.
 */
export function AuthLinks() {
  const mounted = React.useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!mounted) return <span className={cls} aria-hidden />;
  if (!hasAuthHint()) {
    return (
      <Link href="/login" className={cls}>
        Sign in
      </Link>
    );
  }
  return <SessionLinks />;
}

function SessionLinks() {
  const { data, isPending } = useSession();
  const user = data?.user as { role?: string } | undefined;
  if (isPending) return <span className={cls} aria-hidden />;
  if (!user) {
    return (
      <Link href="/login" className={cls}>
        Sign in
      </Link>
    );
  }
  const isEditor = EDITOR_ROLES.has(user.role ?? "");
  const isOwner = user.role === "business_owner";
  return (
    <Link href={isEditor ? "/admin" : isOwner ? "/business" : "/account"} className={cls}>
      {isEditor ? "Admin" : isOwner ? "My business" : "Account"}
    </Link>
  );
}
