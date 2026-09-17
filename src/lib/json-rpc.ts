import { NextResponse } from "next/server";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

/*
 * One JSON-RPC 2.0 HTTP envelope for the MCP and A2A endpoints: rate limit, parse, accept a single message
 * or a batch, answer notifications with 202, never let a handler's throw become a 500.
 */
export type RpcMessage = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: unknown };
export type RpcHandler = (msg: RpcMessage) => Promise<unknown | null>;

const err = (id: RpcMessage["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

export function rpcRoute(handle: RpcHandler) {
  return async (req: Request) => {
    const rl = await rateLimit("search", LIMITS.search.limit, LIMITS.search.windowMs);
    if (!rl.ok) return NextResponse.json(err(null, -32000, "Too many requests"), { status: 429 });
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(err(null, -32700, "Parse error"), { status: 400 });
    }
    const messages = Array.isArray(body) ? body : [body];
    const out: unknown[] = [];
    for (const m of messages) {
      if (!m || typeof m !== "object" || typeof (m as { method?: unknown }).method !== "string") {
        out.push(err(null, -32600, "Invalid request"));
        continue;
      }
      const msg = m as RpcMessage;
      try {
        const r = await handle(msg);
        if (r) out.push(r);
      } catch (e) {
        out.push(err(msg.id, -32603, (e as Error).message));
      }
    }
    if (!out.length) return new Response(null, { status: 202 });
    return NextResponse.json(Array.isArray(body) ? out : out[0], { headers: { "cache-control": "no-store" } });
  };
}
