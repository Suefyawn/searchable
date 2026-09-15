"use client";

/**
 * A readable marker cookie set on sign-in and cleared on sign-out. The header only asks the server for a
 * session when it is present, so the thousands of anonymous page views a day cost zero session requests.
 * Its value is the user id, which lets client UI show "yours" affordances (delete your own comment) without
 * a request. It is a hint, never an authority: the server validates the real (httpOnly) session cookie.
 */
const NAME = "sp_auth";

function read(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((c) => c.startsWith(`${NAME}=`));
  return m ? decodeURIComponent(m.slice(NAME.length + 1)) : null;
}
export function hasAuthHint(): boolean {
  return !!read();
}
/** The signed-in user's id, as hinted by the cookie ("1" for sessions created before ids were stored). */
export function authHintUserId(): string | null {
  const v = read();
  return v && v !== "1" ? v : null;
}
export function setAuthHint(userId?: string) {
  document.cookie = `${NAME}=${encodeURIComponent(userId ?? "1")}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}
export function clearAuthHint() {
  document.cookie = `${NAME}=; path=/; max-age=0; samesite=lax`;
}
