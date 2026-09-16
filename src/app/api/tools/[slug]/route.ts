import { NextResponse } from "next/server";
import { runTool, toolSchema } from "@/lib/agent-api";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** GET /api/tools/{slug}: the calculator's inputs as JSON Schema, with defaults and the page to cite. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = toolSchema(slug);
  if (!s) return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
  return NextResponse.json(s, { headers: { "cache-control": "public, max-age=3600, s-maxage=86400" } });
}

/** POST /api/tools/{slug} { inputs: {...} }: run the calculator and return the result with its sources. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const rl = await rateLimit("toolRun", LIMITS.toolRun.limit, LIMITS.toolRun.windowMs);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { slug } = await params;
  const body = (await req.json().catch(() => ({}))) as { inputs?: Record<string, unknown> };
  try {
    const r = runTool(slug, body.inputs ?? {});
    if (!r) return NextResponse.json({ error: "Unknown tool" }, { status: 404 });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
