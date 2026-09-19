import { NextResponse } from "next/server";
import { z } from "zod";
import { recordError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  message: z.string().max(500),
  name: z.string().max(60).optional(),
  stack: z.string().max(4000).optional(),
  path: z.string().max(300),
  digest: z.string().max(80).optional(),
});

/**
 * Browser crashes (src/app/error.tsx) and unhandled promise rejections, fingerprinted with the server errors
 * (ADR-48). Anonymous, rate limited, nothing personal stored. Public by design: see scripts/check-authz.ts.
 */
export async function POST(req: Request) {
  const rl = await rateLimit("client-errors", 30, 60_000);
  if (!rl.ok) return new NextResponse(null, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const b = parsed.data;
  const err = Object.assign(new Error(b.message), { name: b.name || "Error", stack: b.stack ?? `${b.name || "Error"}: ${b.message}` });
  await recordError("client", b.path, err, { digest: b.digest ?? null, userAgent: (req.headers.get("user-agent") ?? "").slice(0, 200) });
  return new NextResponse(null, { status: 204 });
}
