import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { recordSearchClick } from "@/lib/search";

const Event = z.object({
  name: z.enum(["business_click", "page_view", "share", "tool_share", "search_click", "error"]),
  path: z.string().max(300).optional(),
  props: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

/** First-party analytics beacon. Anonymous; nothing personal is stored. */
export async function POST(req: Request) {
  const rl = await rateLimit("track", 240, 60_000);
  if (!rl.ok) return new NextResponse(null, { status: 429 });
  const parsed = Event.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const e = parsed.data;
  const db = await getDb();
  await db.insert(schema.analyticsEvents).values({ name: e.name, path: e.path, props: e.props ?? {} });
  if (e.name === "search_click" && typeof e.props?.q === "string" && typeof e.props?.url === "string") {
    await recordSearchClick(e.props.q, e.props.url);
  }
  if (e.name === "business_click" && typeof e.props?.businessId === "string") {
    await db.update(schema.businesses).set({ clickCount: sql`${schema.businesses.clickCount} + 1` }).where(eq(schema.businesses.id, e.props.businessId));
  }
  return new NextResponse(null, { status: 204 });
}
