import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const SITE = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "Searchable",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  tagline: "Find what you need. Know what matters.",
  description: "News from Pakistan and the world, step-by-step guides, calculators with verified rates, a business directory and daily data, all searchable in one place.",
  twitter: "@searchablepk",
};
