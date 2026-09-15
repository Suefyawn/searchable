"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getSessionUser, requireUser } from "@/lib/auth";
import { NOTIFY_KINDS, type NotifyKind } from "@/lib/notify";

const Target = z.object({ targetType: z.enum(["article", "tool", "business", "professional", "post", "data_series"]), targetId: z.string().min(1).max(200), title: z.string().trim().min(1).max(200), url: z.string().regex(/^\/[^\s]*$/).max(300) });
export type SaveTarget = z.input<typeof Target>;

/** Bookmark or un-bookmark. Returns the new state so the button can settle without a refetch. */
export async function toggleSaved(raw: SaveTarget): Promise<{ ok: boolean; saved?: boolean; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to save." };
  const parsed = Target.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Cannot save this." };
  const d = parsed.data;
  const db = await getDb();
  const existing = await db.query.savedItems.findFirst({ where: and(eq(schema.savedItems.userId, user.id), eq(schema.savedItems.targetType, d.targetType), eq(schema.savedItems.targetId, d.targetId)), columns: { id: true } });
  if (existing) {
    await db.delete(schema.savedItems).where(eq(schema.savedItems.id, existing.id));
    revalidatePath("/account/saved");
    return { ok: true, saved: false };
  }
  const count = await db.$count(schema.savedItems, eq(schema.savedItems.userId, user.id));
  if (count >= 500) return { ok: false, error: "You have 500 saved items; remove some first." };
  await db.insert(schema.savedItems).values({ userId: user.id, ...d }).onConflictDoNothing();
  revalidatePath("/account/saved");
  return { ok: true, saved: true };
}

export async function listSaved() {
  const user = await requireUser("/account/saved");
  const db = await getDb();
  return db.query.savedItems.findMany({ where: eq(schema.savedItems.userId, user.id), orderBy: [desc(schema.savedItems.createdAt)], limit: 500 });
}

export async function setNotificationPreference(kind: NotifyKind, on: boolean): Promise<{ ok: boolean }> {
  if (!NOTIFY_KINDS.some((k) => k.kind === kind)) return { ok: false };
  const user = await requireUser("/account/notifications");
  const db = await getDb();
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { notificationPrefs: true } });
  await db.update(schema.users).set({ notificationPrefs: { ...(row?.notificationPrefs ?? {}), [kind]: on } }).where(eq(schema.users.id, user.id));
  revalidatePath("/account/notifications");
  return { ok: true };
}
