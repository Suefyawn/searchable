"use client";

import { useEffect, useRef } from "react";

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const mounted = new Set<string>();

/** A token verifies once. Call this when the server rejected a submission, so the next attempt carries a fresh one. */
export function resetTurnstile(): void {
  for (const id of mounted) window.turnstile?.reset(id);
}

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id?: string) => void };
  }
}

/**
 * Cloudflare Turnstile widget (ADR-47). Place it inside a <form>: the widget adds a hidden input named
 * `cf-turnstile-response` there, so `turnstileToken(new FormData(form))` is the token to pass to the action.
 * The site key is a runtime var (TURNSTILE_SITE_KEY, written by the root layout into a meta tag) rather than a
 * build-time NEXT_PUBLIC value, so one build serves staging and production. Without a key nothing renders and
 * the server skips verification.
 */
/** `size`: "flexible" fills the form (min 300 px wide); "compact" is the 150 px square for narrow columns such as the footer. */
export function Turnstile({ className, size = "flexible" }: { className?: string; size?: "flexible" | "compact" | "normal" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const siteKey = document.querySelector<HTMLMetaElement>('meta[name="turnstile-site-key"]')?.content;
    if (!siteKey) return;
    if (!document.querySelector(`script[src^="${SCRIPT}"]`)) {
      const s = document.createElement("script");
      s.src = `${SCRIPT}?render=explicit`;
      s.async = true;
      document.head.appendChild(s);
    }
    let id: string | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const mount = () => {
      if (ref.current && window.turnstile && id === undefined) {
        id = window.turnstile.render(ref.current, { sitekey: siteKey, theme: "auto", size });
        mounted.add(id);
      }
    };
    if (window.turnstile) mount();
    else
      timer = setInterval(() => {
        if (window.turnstile) {
          clearInterval(timer);
          mount();
        }
      }, 200);
    return () => {
      if (timer) clearInterval(timer);
      if (id) {
        mounted.delete(id);
        window.turnstile?.remove(id);
      }
    };
  }, [size]);
  // Always an (empty) div, so server and client markup agree whether or not a key is configured.
  return <div ref={ref} className={className} />;
}

/** The token the widget wrote into the form, or undefined when the widget is off. */
export function turnstileToken(fd: FormData): string | undefined {
  const t = fd.get("cf-turnstile-response");
  return typeof t === "string" && t ? t : undefined;
}
