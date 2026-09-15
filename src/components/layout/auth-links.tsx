"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";

const EDITOR_ROLES = new Set(["editor", "admin"]);

/** Session-aware header links. Client-side so public pages stay statically cacheable. */
export function AuthLinks() {
  const { data, isPending } = useSession();
  const user = data?.user as { role?: string } | undefined;
  const cls = "hidden sm:inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-2 hover:bg-surface-2 hover:text-[var(--text)]";
  if (isPending) return <span className={cls} aria-hidden />;
  if (user) {
    const isEditor = EDITOR_ROLES.has(user.role ?? "");
    return (
      <Link href={isEditor ? "/admin" : "/account"} className={cls}>
        {isEditor ? "Admin" : "Account"}
      </Link>
    );
  }
  return (
    <Link href="/login" className={cls}>
      Sign in
    </Link>
  );
}
