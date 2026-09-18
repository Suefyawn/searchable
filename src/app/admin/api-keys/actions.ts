"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Result } from "@/components/admin/action-form";
import { getDb, schema } from "@/db";
import { apiKeyPrefix, generateApiKey, hashApiKey } from "@/lib/api-keys";
import { requireRole } from "@/lib/auth";

/* Admin API keys (ADR-40). Admin only: a key is as powerful as the account that holds it. */

const KeyInput = z.object({ name: z.string().trim().min(2, "Give the key a name").max(80), role: z.enum(["editor", "admin"]) });

export async function createApiKey(_prev: Result, formData: FormData): Promise<Result> {
  const me = await requireRole("admin");
  const parsed = KeyInput.safeParse({ name: formData.get("name"), role: formData.get("role") ?? "admin" });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  const key = generateApiKey();
  const db = await getDb();
  await db.insert(schema.apiKeys).values({ name: parsed.data.name, role: parsed.data.role, prefix: apiKeyPrefix(key), keyHash: await hashApiKey(key), createdBy: me.id });
  revalidatePath("/admin/api-keys");
  return { ok: true, message: `Copy the key now, it is shown once: ${key}` };
}

export async function revokeApiKey(id: string, _prev: Result): Promise<Result> {
  await requireRole("admin");
  const db = await getDb();
  await db.update(schema.apiKeys).set({ revokedAt: new Date() }).where(eq(schema.apiKeys.id, id));
  revalidatePath("/admin/api-keys");
  return { ok: true, message: "Revoked" };
}
