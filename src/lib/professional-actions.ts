"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getSessionUser, hasRole, requireRole } from "@/lib/auth";
import { notifyProfessionalLead } from "@/lib/notify";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { slugify, uniqueSlug } from "@/lib/slug";
import { canEditProfessional, indexProfessional } from "./professionals";
import { ProfessionalInput, type ProfessionalFormInput } from "./professional-schema";

/**
 * Create or update a profile. New profiles start pending and go live once an editor approves; edits to a
 * live profile stay live (owners fix typos without a re-review) but drop the verified mark if the name or
 * profession changes, since that is what verification checked.
 */
export async function saveProfessional(raw: ProfessionalFormInput): Promise<{ ok: boolean; id?: string; slug?: string; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in first." };
  const parsed = ProfessionalInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const d = parsed.data;
  const db = await getDb();
  const website = d.website && !/^https?:\/\//.test(d.website) ? `https://${d.website}` : d.website;
  const values = {
    name: d.name,
    professionSlug: d.professionSlug,
    headline: d.headline || null,
    bio: d.bio || null,
    cityId: d.cityId || null,
    areaId: d.areaId || null,
    workplace: d.workplace || null,
    serviceMode: d.serviceMode ?? null,
    phone: d.phone || null,
    whatsapp: d.whatsapp || null,
    email: d.email || null,
    showEmail: d.showEmail,
    website: website || null,
    social: { linkedin: d.linkedin || undefined, x: d.x || undefined, instagram: d.instagram || undefined, facebook: d.facebook || undefined, github: d.github || undefined, youtube: d.youtube || undefined, tiktok: d.tiktok || undefined, behance: d.behance || undefined },
    languages: d.languages,
    skills: d.skills,
    services: d.services,
    experience: d.experience,
    education: d.education,
    certifications: d.certifications,
    yearsExperience: d.yearsExperience ?? null,
    licenceNo: d.licenceNo || null,
    availability: d.availability || null,
    rateFrom: d.rateFrom ?? null,
    rateUnit: d.rateUnit || null,
    cvUrl: d.cvUrl || null,
    cvPublic: d.cvPublic,
    photoUrl: d.photoUrl || null,
  };

  if (d.id) {
    if (!(await canEditProfessional(user, d.id))) return { ok: false, error: "You do not have permission to edit this profile." };
    const before = await db.query.professionals.findFirst({ where: eq(schema.professionals.id, d.id), columns: { name: true, professionSlug: true, isVerified: true, slug: true, tier: true } });
    if (!before) return { ok: false, error: "Profile not found" };
    const identityChanged = before.name !== d.name || before.professionSlug !== d.professionSlug;
    await db
      .update(schema.professionals)
      .set({ ...values, ...(identityChanged && before.isVerified && before.tier === "free" ? { isVerified: false, verifiedAt: null } : {}) })
      .where(eq(schema.professionals.id, d.id));
    await indexProfessional(d.id);
    revalidatePath(`/p/${before.slug}`);
    revalidatePath("/professional");
    return { ok: true, id: d.id, slug: before.slug };
  }

  const rl = await rateLimit("professional-create", 3, 60 * 60_000);
  if (!rl.ok) return { ok: false, error: "Too many profiles created. Try again later." };
  const existing = await db.query.professionals.findMany({ where: eq(schema.professionals.ownerUserId, user.id), columns: { id: true } });
  if (existing.length >= 2 && !hasRole(user, "editor")) return { ok: false, error: "One account can hold two profiles. Contact us if you need more." };
  const city = d.cityId ? await db.query.locations.findFirst({ where: eq(schema.locations.id, d.cityId), columns: { slug: true } }) : null;
  const base = slugify(`${d.name} ${d.professionSlug}${city ? ` ${city.slug}` : ""}`);
  const slug = await uniqueSlug(base, async (s) => !!(await db.query.professionals.findFirst({ where: eq(schema.professionals.slug, s), columns: { id: true } })));
  const [row] = await db
    .insert(schema.professionals)
    .values({ ...values, slug, ownerUserId: user.id, status: hasRole(user, "editor") ? "active" : "pending" })
    .returning({ id: schema.professionals.id });
  await indexProfessional(row.id);
  revalidatePath("/professional");
  revalidatePath("/admin/professionals");
  return { ok: true, id: row.id, slug };
}

const Lead = z.object({ professionalId: z.string().min(1), name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), email: z.string().trim().email().max(120).optional().or(z.literal("")), message: z.string().trim().max(1000).optional(), website: z.string().max(0).optional() });

/** Enquiry from a profile page. `website` is a honeypot. */
export async function sendProfessionalLead(input: z.input<typeof Lead>): Promise<{ ok: boolean; error?: string }> {
  const parsed = Lead.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check your name and phone number." };
  if (parsed.data.website) return { ok: true };
  const rl = await rateLimit("lead", LIMITS.lead.limit, LIMITS.lead.windowMs);
  if (!rl.ok) return { ok: false, error: "Too many enquiries. Try again in a few minutes." };
  const db = await getDb();
  const p = await db.query.professionals.findFirst({ where: eq(schema.professionals.id, parsed.data.professionalId), columns: { id: true, status: true } });
  if (!p || p.status !== "active") return { ok: false, error: "Profile not available." };
  await db.insert(schema.professionalLeads).values({ professionalId: p.id, name: parsed.data.name, phone: parsed.data.phone, email: parsed.data.email || null, message: parsed.data.message || null, source: "profile" });
  await notifyProfessionalLead(p.id, { name: parsed.data.name, phone: parsed.data.phone, email: parsed.data.email, message: parsed.data.message });
  return { ok: true };
}

export async function setProfessionalStatus(id: string, status: "pending" | "active" | "hidden" | "rejected") {
  await requireRole("editor");
  const db = await getDb();
  await db.update(schema.professionals).set({ status }).where(eq(schema.professionals.id, id));
  await indexProfessional(id);
  const p = await db.query.professionals.findFirst({ where: eq(schema.professionals.id, id), columns: { slug: true } });
  if (p) revalidatePath(`/p/${p.slug}`);
  revalidatePath("/professionals");
  revalidatePath("/admin/professionals");
  revalidatePath("/admin");
}

/** Manual verification by an editor (after checking the registration number); paid plans set it through orders. */
export async function setProfessionalVerified(id: string, verified: boolean) {
  await requireRole("editor");
  const db = await getDb();
  await db.update(schema.professionals).set({ isVerified: verified, verifiedAt: verified ? new Date() : null }).where(eq(schema.professionals.id, id));
  await indexProfessional(id);
  const p = await db.query.professionals.findFirst({ where: eq(schema.professionals.id, id), columns: { slug: true } });
  if (p) revalidatePath(`/p/${p.slug}`);
  revalidatePath("/admin/professionals");
}
