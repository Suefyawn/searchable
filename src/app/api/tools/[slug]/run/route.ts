import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getTool } from "@/tools/registry";

/** Anonymous usage log + run counter. Inputs are kept only in aggregate form for product decisions. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const rl = await rateLimit("toolRun", LIMITS.toolRun.limit, LIMITS.toolRun.windowMs);
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { inputs?: Record<string, unknown> };
  const db = await getDb();
  await db.insert(schema.toolRuns).values({ toolSlug: slug, inputs: body.inputs ?? {} });
  await db.update(schema.tools).set({ runCount: sql`${schema.tools.runCount} + 1` }).where(eq(schema.tools.slug, slug));
  return NextResponse.json({ ok: true });
}
