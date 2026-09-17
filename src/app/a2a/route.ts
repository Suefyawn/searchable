import { NextResponse } from "next/server";
import { handleA2a } from "@/lib/a2a";
import { rpcRoute } from "@/lib/json-rpc";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** A2A over JSON-RPC: POST a message/send request, get one text answer built from the site's own data. */
export const POST = rpcRoute(handleA2a);

export function GET() {
  return NextResponse.json({ error: "POST a JSON-RPC message/send request; the agent card is at /.well-known/agent-card.json" }, { status: 405, headers: { allow: "POST" } });
}
