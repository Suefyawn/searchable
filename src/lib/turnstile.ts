import { headers } from "next/headers";

/**
 * Cloudflare Turnstile (ADR-47). Public forms carry the widget's token as `turnstile`; the server asks siteverify
 * once per submission. With no TURNSTILE_SECRET set (local, tests, staging before the widget exists) every
 * submission passes, so the forms keep working and only the rate limits stand.
 */
export const TURNSTILE_FIELD = "cf-turnstile-response";

export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET?.trim();
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  const ip = (await headers()).get("cf-connecting-ip");
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export const TURNSTILE_ERROR = "Please complete the verification and try again.";
