"use server";

import { revalidatePath } from "next/cache";
import type { Result } from "@/components/admin/action-form";
import { requireRole } from "@/lib/auth";
import { Brand, BRAND_DEFAULTS, SiteSettings, writeSiteSettings } from "@/lib/site-settings";

/**
 * Brand tokens and identity lines are in every page's chrome, so those saves re-render the whole layout.
 * The front-page settings (hero, ticker, home switches) only change the homepage and the footer capture,
 * which is not worth a site-wide purge (docs/FREE-TIER.md).
 */
function revalidateAll(scope: "layout" | "home" = "layout") {
  if (scope === "layout") revalidatePath("/", "layout");
  else revalidatePath("/");
  revalidatePath("/admin/settings");
}

export async function saveBrand(_prev: Result, formData: FormData): Promise<Result> {
  await requireRole("admin");
  const parsed = Brand.safeParse({ ink: formData.get("ink"), slate: formData.get("slate"), accent: formData.get("accent"), link: formData.get("link"), primary: formData.get("primary") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the colours" };
  await writeSiteSettings("brand", parsed.data);
  revalidateAll();
  return { ok: true, message: "Brand saved; every page uses it now" };
}

export async function resetBrand(_prev: Result, _formData: FormData): Promise<Result> {
  await requireRole("admin");
  await writeSiteSettings("brand", { ...BRAND_DEFAULTS });
  revalidateAll();
  return { ok: true, message: "Back to the charcoal and blue kit" };
}

export async function saveIdentity(_prev: Result, formData: FormData): Promise<Result> {
  await requireRole("admin");
  const parsed = SiteSettings.shape.identity.safeParse({
    tagline: formData.get("tagline"),
    contactEmail: formData.get("contactEmail") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    social: { x: formData.get("x") ?? "", facebook: formData.get("facebook") ?? "", instagram: formData.get("instagram") ?? "", youtube: formData.get("youtube") ?? "", linkedin: formData.get("linkedin") ?? "", tiktok: formData.get("tiktok") ?? "" },
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  await writeSiteSettings("identity", parsed.data);
  revalidateAll();
  return { ok: true, message: "Saved" };
}

export async function saveFront(_prev: Result, formData: FormData): Promise<Result> {
  await requireRole("admin");
  const parsed = SiteSettings.shape.front.safeParse({
    heroSlides: Number(formData.get("heroSlides")),
    carouselSeconds: Number(formData.get("carouselSeconds")),
    tickerOrder: String(formData.get("tickerOrder") ?? "")
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  await writeSiteSettings("front", parsed.data);
  revalidateAll("home");
  return { ok: true, message: "Saved" };
}

export async function saveFeatures(_prev: Result, formData: FormData): Promise<Result> {
  await requireRole("admin");
  const on = (k: string) => formData.get(k) === "on";
  const parsed = SiteSettings.shape.features.safeParse({ homeCommunity: on("homeCommunity"), homeProfessionals: on("homeProfessionals"), homeWorld: on("homeWorld"), newsletterCapture: on("newsletterCapture") });
  if (!parsed.success) return { ok: false, error: "Check the switches" };
  await writeSiteSettings("features", parsed.data);
  revalidateAll("home");
  return { ok: true, message: "Saved" };
}
