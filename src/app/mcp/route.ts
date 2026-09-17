import { NextResponse } from "next/server";
import { rpcRoute } from "@/lib/json-rpc";
import { handleMcp } from "@/lib/mcp";

export const dynamic = "force-dynamic";

/** Streamable HTTP transport, JSON responses only (no SSE): POST a JSON-RPC message or a batch. */
export const POST = rpcRoute(handleMcp);

/** No server-initiated stream: clients get everything in the POST response. */
export function GET() {
  return NextResponse.json({ error: "Use POST with a JSON-RPC message; see /.well-known/mcp/server-card.json" }, { status: 405, headers: { allow: "POST" } });
}

export function DELETE() {
  return new Response(null, { status: 204 });
}
