import { NextResponse } from "next/server";
import { API_VERSION } from "@/lib/agent-api";
import { cronAuthorized } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/**
 * Liveness for monitors and the API catalog's status link. No database call: this answers even when the pool is
 * busy. `?boom=1` with the CRON_SECRET throws on purpose, to check the error tracker end to end (ADR-48).
 */
export function GET(req: Request) {
  if (new URL(req.url).searchParams.get("boom") === "1" && cronAuthorized(req)) throw new Error("health check boom: deliberate test error");
  return NextResponse.json({ ok: true, service: "searchable.pk", version: API_VERSION, time: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
}
