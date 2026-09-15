"use client";

import Link from "next/link";
import * as React from "react";
import { hasAuthHint } from "@/lib/auth-hint";
import { useSession } from "@/lib/auth-client";

const subscribeNoop = () => () => {};
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
  if (isPending) return <span className={cls} aria-hidden />;
  if (!data?.user) {
    return (
      <Link href="/login" className={cls}>
        Sign in
      </Link>
    );
  }
  // One neutral link for every role: the public masthead never says "Admin". The account page carries the
  // admin, business and professional dashboards for those who have them.
  return (
    <Link href="/account" className={cls}>
      Account
    </Link>
  );
}
