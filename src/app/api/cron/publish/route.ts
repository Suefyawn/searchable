import { NextResponse } from "next/server";
import { publishDueArticles } from "@/app/admin/articles/actions";
import { sendDueIssues } from "@/lib/newsletter-issue";

/**
 * Vercel Cron target (see vercel.json). Locally: curl -H "authorization: Bearer $CRON_SECRET" /api/cron/publish
 * If CRON_SECRET is unset (local dev), the endpoint is open.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const published = await publishDueArticles();
  const newsletters = await sendDueIssues();
  return NextResponse.json({ ok: true, published, newsletters, at: new Date().toISOString() });
}
