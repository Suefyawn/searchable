import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Site origin: NEXT_PUBLIC_SITE_URL, else the Vercel production host, else localhost. Empty strings count as unset so a half-filled dashboard never breaks the build. */
function siteUrl() {
  const set = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (set) return set.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Searchable",
  url: siteUrl(),
  tagline: "Find what you need. Know what matters.",
  description: "News from Pakistan and the world, step-by-step guides, calculators with verified rates, a business directory and daily data, all searchable in one place.",
  twitter: "@searchablepk",
};
