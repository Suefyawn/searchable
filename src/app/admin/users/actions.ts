"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getAuth, requireRole, type Role } from "@/lib/auth";

/*
 * Admin user management. Everything here needs the admin role (editors moderate content, not accounts).
 * Two guards keep the site reachable: an admin cannot delete or demote their own account, and the last
 * admin cannot be demoted or deleted.
 */

const ROLES = ["user", "business_owner", "editor", "admin"] as const;
const UserInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  role: z.enum(ROLES),
  emailVerified: z.boolean().default(false),
});
const Password = z.string().min(8, "At least 8 characters").max(128);

import type { Result } from "@/components/admin/action-form";
export type { Result };

/*
 * Every action takes (id, previousState, formData) so a form can bind the id and hand the rest to
 * useActionState; createUser has no id yet.
 */

async function adminCount(): Promise<number> {
  const db = await getDb();
  return db.$count(schema.users, eq(schema.users.role, "admin"));
}

async function protectLastAdmin(targetId: string, nextRole?: Role): Promise<string | null> {
  const db = await getDb();
  const target = await db.query.users.findFirst({ where: eq(schema.users.id, targetId), columns: { role: true } });
  if (!target) return "No such user";
  if (target.role === "admin" && nextRole !== "admin" && (await adminCount()) <= 1) return "This is the only admin account; make someone else admin first";
  return null;
}

/** better-auth's password hasher and credential-account helpers, the same ones its own routes use. */
async function credentials() {
  const auth = await getAuth();
  const ctx = await auth.$context;
  return {
    async setPassword(userId: string, password: string) {
      const hashed = await ctx.password.hash(password);
      if (await ctx.internalAdapter.findCredentialAccount(userId)) await ctx.internalAdapter.updatePassword(userId, hashed);
      else await ctx.internalAdapter.createAccount({ userId, providerId: "credential", accountId: userId, password: hashed });
    },
  };
}

function revalidate(id?: string) {
  revalidatePath("/admin/users");
  if (id) revalidatePath(`/admin/users/${id}`);
}

export async function createUser(_prev: Result, formData: FormData): Promise<Result> {
  await requireRole("admin");
  const parsed = UserInput.extend({ password: Password }).safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    emailVerified: formData.get("emailVerified") === "on",
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  const d = parsed.data;
  const db = await getDb();
  if (await db.query.users.findFirst({ where: eq(schema.users.email, d.email), columns: { id: true } })) return { ok: false, error: "An account with that email already exists" };
  const id = randomUUID();
  await db.insert(schema.users).values({ id, name: d.name, email: d.email, role: d.role, emailVerified: d.emailVerified });
  await (await credentials()).setPassword(id, d.password);
  revalidate();
  redirect(`/admin/users/${id}`);
}

export async function updateUser(id: string, _prev: Result, formData: FormData): Promise<Result> {
  const me = await requireRole("admin");
  const parsed = UserInput.safeParse({ name: formData.get("name"), email: formData.get("email"), role: formData.get("role"), emailVerified: formData.get("emailVerified") === "on" });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  const d = parsed.data;
  if (id === me.id && d.role !== "admin") return { ok: false, error: "You cannot remove your own admin role" };
  const guard = await protectLastAdmin(id, d.role);
  if (guard) return { ok: false, error: guard };
  const db = await getDb();
  const clash = await db.query.users.findFirst({ where: eq(schema.users.email, d.email), columns: { id: true } });
  if (clash && clash.id !== id) return { ok: false, error: "Another account already uses that email" };
  await db.update(schema.users).set({ name: d.name, email: d.email, role: d.role, emailVerified: d.emailVerified, updatedAt: new Date() }).where(eq(schema.users.id, id));
  revalidate(id);
  return { ok: true, message: "Saved" };
}

/** Inline role change from the list (the role comes from a <select name="role">). */
export async function setUserRole(id: string, _prev: Result, formData: FormData): Promise<Result> {
  const me = await requireRole("admin");
  const role = String(formData.get("role") ?? "") as Role;
  if (!ROLES.includes(role)) return { ok: false, error: "Unknown role" };
  if (id === me.id && role !== "admin") return { ok: false, error: "You cannot remove your own admin role" };
  const guard = await protectLastAdmin(id, role);
  if (guard) return { ok: false, error: guard };
  const db = await getDb();
  await db.update(schema.users).set({ role, updatedAt: new Date() }).where(eq(schema.users.id, id));
  revalidate(id);
  return { ok: true, message: `Now ${role.replace("_", " ")}` };
}

export async function setUserPassword(id: string, _prev: Result, formData: FormData): Promise<Result> {
  await requireRole("admin");
  const parsed = Password.safeParse(formData.get("password"));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the password" };
  await (await credentials()).setPassword(id, parsed.data);
  // A new password signs every device out; the person signs in again with it.
  const db = await getDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  revalidate(id);
  return { ok: true, message: "Password set; every device is signed out" };
}

export async function revokeSessions(id: string, _prev: Result, _formData: FormData): Promise<Result> {
  await requireRole("admin");
  const db = await getDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  revalidate(id);
  return { ok: true, message: "Signed out everywhere" };
}

export async function setUserBanned(id: string, banned: boolean, _prev: Result, _formData: FormData): Promise<Result> {
  await requireRole("admin");
  const db = await getDb();
  const member = await db.query.memberProfiles.findFirst({ where: eq(schema.memberProfiles.userId, id), columns: { id: true, handle: true } });
  if (!member) return { ok: false, error: "No community profile to ban; the account can still be deleted" };
  await db.update(schema.memberProfiles).set({ isBanned: banned, updatedAt: new Date() }).where(eq(schema.memberProfiles.id, member.id));
  if (banned) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  revalidate(id);
  revalidatePath(`/u/${member.handle}`);
  return { ok: true, message: banned ? "Banned from the community and signed out" : "Ban lifted" };
}

/**
 * Delete the account. Sessions, credentials, the community profile, posts, comments, reactions and saved
 * items go with it (cascade); businesses, professional profiles, reviews, orders and pitches stay and lose
 * their owner (set null), so listings and paid records survive the person.
 */
export async function deleteUser(id: string, _prev: Result, _formData: FormData): Promise<Result> {
  const me = await requireRole("admin");
  if (id === me.id) return { ok: false, error: "You cannot delete your own account" };
  const guard = await protectLastAdmin(id);
  if (guard) return { ok: false, error: guard };
  const db = await getDb();
  await db.delete(schema.users).where(eq(schema.users.id, id));
  await db.insert(schema.analyticsEvents).values({ name: "user_deleted", props: { id, by: me.id } });
  revalidate();
  redirect("/admin/users");
}
