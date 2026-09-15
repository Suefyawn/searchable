import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribe } from "@/lib/newsletter";
import { LIMITS, rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  email: z.email(),
  name: z.string().max(80).optional(),
  topics: z.array(z.string()).max(12).optional(),
  frequency: z.enum(["daily", "weekly"]).optional(),
  source: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  const rl = await rateLimit("newsletter", LIMITS.newsletter.limit, LIMITS.newsletter.windowMs);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  try {
    const result = await subscribe(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not subscribe right now. Please try again." }, { status: 500 });
  }
}
