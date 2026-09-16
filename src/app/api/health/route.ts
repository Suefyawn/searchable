import { NextResponse } from "next/server";
import { API_VERSION } from "@/lib/agent-api";

export const dynamic = "force-dynamic";

/** Liveness for monitors and the API catalog's status link. No database call: this answers even when the pool is busy. */
export function GET() {
  return NextResponse.json({ ok: true, service: "searchable.pk", version: API_VERSION, time: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
