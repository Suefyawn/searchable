import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { track } from "@/lib/track";
import { getTool } from "@/tools/registry";

/** Anonymous usage log + run counter. Inputs are kept only in aggregate form for product decisions. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const rl = await rateLimit("toolRun", LIMITS.toolRun.limit, LIMITS.toolRun.windowMs);
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
  const Body = z.object({ inputs: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).refine((i) => Object.keys(i).length <= 40).default({}) });
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });
  const db = await getDb();
  await db.insert(schema.toolRuns).values({ toolSlug: slug, inputs: body.data.inputs });
  await db.update(schema.tools).set({ runCount: sql`${schema.tools.runCount} + 1` }).where(eq(schema.tools.slug, slug));
  track("calculator_used", { blobs: [slug, tool.category] });
  return NextResponse.json({ ok: true });
}
