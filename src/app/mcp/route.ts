import { NextResponse } from "next/server";
import { handleMcp } from "@/lib/mcp";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Streamable HTTP transport, JSON responses only (no SSE): POST a JSON-RPC message or a batch. */
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
    const r = await handleMcp(m as Parameters<typeof handleMcp>[0]);
    if (r) out.push(r);
  }
  if (!out.length) return new Response(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? out : out[0], { headers: { "cache-control": "no-store" } });
}

/** No server-initiated stream: clients get everything in the POST response. */
export function GET() {
  return NextResponse.json({ error: "Use POST with a JSON-RPC message; see /.well-known/mcp/server-card.json" }, { status: 405, headers: { allow: "POST" } });
}

export function DELETE() {
  return new Response(null, { status: 204 });
}
