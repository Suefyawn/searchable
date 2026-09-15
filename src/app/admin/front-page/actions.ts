"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { readFrontPage, writeFrontPage, type FrontPageT } from "@/lib/front-page";

type Result = { ok: boolean; error?: string; front?: FrontPageT };

/** The homepage, the news front and the layout (breaking bar) all read the front-page settings. */
function revalidateFront() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/news");
  revalidatePath("/admin/front-page");
}

async function publishedNews(id: string) {
  const db = await getDb();
  return db.query.articles.findFirst({ where: and(eq(schema.articles.id, id), eq(schema.articles.status, "published")), columns: { id: true, kind: true } });
}

/** Pin a story as the lead for `hours` (0 clears). */
export async function setLead(raw: { id: string | null; hours?: number }): Promise<Result> {
  await requireRole("editor");
  const d = z.object({ id: z.string().nullable(), hours: z.number().min(1).max(168).default(24) }).parse(raw);
  if (d.id && !(await publishedNews(d.id))) return { ok: false, error: "That story is not published" };
  const front = await writeFrontPage({ leadId: d.id, leadUntil: d.id ? new Date(Date.now() + d.hours * 3_600_000).toISOString() : null });
  revalidateFront();
  return { ok: true, front };
}

/** Replace the pinned list (ordered). Unknown or unpublished ids are dropped. */
export async function setPins(ids: string[]): Promise<Result> {
  await requireRole("editor");
  const wanted = z.array(z.string()).max(6).parse(ids);
  const kept: string[] = [];
  for (const id of wanted) if (await publishedNews(id)) kept.push(id);
  const front = await writeFrontPage({ pins: kept });
  revalidateFront();
  return { ok: true, front };
}

/** Set or clear the breaking bar. */
export async function setBreaking(raw: { text: string; href?: string; hours?: number } | null): Promise<Result> {
  await requireRole("editor");
  if (!raw) {
    const front = await writeFrontPage({ breaking: null });
    revalidateFront();
    return { ok: true, front };
  }
  const parsed = z.object({ text: z.string().trim().min(3).max(160), href: z.string().trim().max(300).optional(), hours: z.number().min(0.5).max(72).default(6) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the text" };
  const d = parsed.data;
  const front = await writeFrontPage({ breaking: { text: d.text, href: d.href || "", until: new Date(Date.now() + d.hours * 3_600_000).toISOString() } });
  revalidateFront();
  return { ok: true, front };
}

/** Flip the featured flag; only one news story carries it at a time. */
export async function setFeatured(id: string, featured: boolean): Promise<Result> {
  await requireRole("editor");
  const db = await getDb();
  if (!(await publishedNews(id))) return { ok: false, error: "That story is not published" };
  if (featured) await db.update(schema.articles).set({ isFeatured: false }).where(and(eq(schema.articles.kind, "news"), ne(schema.articles.id, id)));
  await db.update(schema.articles).set({ isFeatured: featured }).where(eq(schema.articles.id, id));
  revalidateFront();
  return { ok: true, front: await readFrontPage() };
}
