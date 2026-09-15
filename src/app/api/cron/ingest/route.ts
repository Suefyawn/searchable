import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";

/** Daily data-hub ingestion (see vercel.json). Locally: curl /api/cron/ingest */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runIngestion();
  if (result.results.some((r) => r.status === "written")) {
    revalidatePath("/data");
    revalidatePath("/data/[slug]", "page");
    revalidatePath("/");
  }
  return NextResponse.json({ ok: true, ...result });
}
