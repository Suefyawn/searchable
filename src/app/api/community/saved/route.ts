import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { getSessionUser } from "@/lib/auth";

/** Which of the given "type:id" targets the signed-in user has saved. Private, never cached. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  const raw = new URL(req.url).searchParams.get("t") ?? "";
  if (!user || !raw) return NextResponse.json({ saved: [] }, { headers: { "cache-control": "private, no-store" } });
  const ids = raw.split(",").slice(0, 100).map((s) => s.split(":")[1]).filter(Boolean);
  const db = await getDb();
  const rows = ids.length ? await db.select({ t: schema.savedItems.targetType, id: schema.savedItems.targetId }).from(schema.savedItems).where(and(eq(schema.savedItems.userId, user.id), inArray(schema.savedItems.targetId, ids))) : [];
  return NextResponse.json({ saved: rows.map((r) => `${r.t}:${r.id}`) }, { headers: { "cache-control": "private, no-store" } });
}
