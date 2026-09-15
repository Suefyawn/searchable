"use server";

import { revalidatePath } from "next/cache";
import type { Result } from "@/components/admin/action-form";
import { requireRole } from "@/lib/auth";
import { Brand, BRAND_DEFAULTS, SiteSettings, writeSiteSettings } from "@/lib/site-settings";

/** Every page carries the brand tokens and the header lines, so the whole layout is re-rendered. */
function revalidateAll() {
  revalidatePath("/", "layout");
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
  revalidateAll();
  return { ok: true, message: "Saved" };
}

export async function saveFeatures(_prev: Result, formData: FormData): Promise<Result> {
  await requireRole("admin");
  const on = (k: string) => formData.get(k) === "on";
  const parsed = SiteSettings.shape.features.safeParse({ homeCommunity: on("homeCommunity"), homeProfessionals: on("homeProfessionals"), homeWorld: on("homeWorld"), homePress: on("homePress"), newsletterCapture: on("newsletterCapture") });
  if (!parsed.success) return { ok: false, error: "Check the switches" };
  await writeSiteSettings("features", parsed.data);
  revalidateAll();
  return { ok: true, message: "Saved" };
}
