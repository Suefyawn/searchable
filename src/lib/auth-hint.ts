"use client";

/**
 * A readable marker cookie set on sign-in and cleared on sign-out. The header only asks the server for a
 * session when it is present, so the thousands of anonymous page views a day cost zero session requests.
 * It is a hint, never an authority: the server still validates the real (httpOnly) session cookie.
 */
const NAME = "sp_auth";

export function hasAuthHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${NAME}=`));
}
export function setAuthHint() {
  document.cookie = `${NAME}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}
export function clearAuthHint() {
  document.cookie = `${NAME}=; path=/; max-age=0; samesite=lax`;
}
