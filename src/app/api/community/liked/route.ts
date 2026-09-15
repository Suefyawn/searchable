import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { likedSet } from "@/lib/community";

/** Which of the given targets ("post:id,comment:id,…") the signed-in user has liked. Private, never cached. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  const raw = new URL(req.url).searchParams.get("t") ?? "";
  if (!user || !raw) return NextResponse.json({ liked: [] }, { headers: { "cache-control": "private, no-store" } });
  const targets = raw.split(",").slice(0, 400).map((s) => s.split(":")).filter((p) => p.length === 2) as [string, string][];
  const liked: string[] = [];
  for (const type of ["post", "comment", "article"] as const) {
    const ids = targets.filter((t) => t[0] === type).map((t) => t[1]);
    if (!ids.length) continue;
    const set = await likedSet(user.id, type, ids);
    for (const id of set) liked.push(`${type}:${id}`);
  }
  return NextResponse.json({ liked }, { headers: { "cache-control": "private, no-store" } });
}
