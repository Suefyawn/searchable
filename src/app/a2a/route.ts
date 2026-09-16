import { NextResponse } from "next/server";
import { handleA2a } from "@/lib/a2a";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** A2A over JSON-RPC: POST a message/send request, get one text answer built from the site's own data. */
export async function POST(req: Request) {
  const rl = await rateLimit("search", LIMITS.search.limit, LIMITS.search.windowMs);
  if (!rl.ok) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Too many requests" } }, { status: 429 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }
  const messages = Array.isArray(body) ? body : [body];
  const out = [];
  for (const m of messages) {
    if (!m || typeof m !== "object" || typeof (m as { method?: unknown }).method !== "string") {
      out.push({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } });
      continue;
    }
    const r = await handleA2a(m as Parameters<typeof handleA2a>[0]);
    if (r) out.push(r);
  }
  if (!out.length) return new Response(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? out : out[0], { headers: { "cache-control": "no-store" } });
}

export function GET() {
  return NextResponse.json({ error: "POST a JSON-RPC message/send request; the agent card is at /.well-known/agent-card.json" }, { status: 405, headers: { allow: "POST" } });
}
