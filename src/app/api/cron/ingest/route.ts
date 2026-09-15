import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";
import { pruneOldRows, runDueJobs } from "@/lib/jobs";

// Ingestion, sends and image processing take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

/** Daily cron (see vercel.json): data-hub ingestion, row pruning and any due publishing work. Locally: curl /api/cron/ingest */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runIngestion();
  const pruned = await pruneOldRows();
  const jobs = await runDueJobs({ force: true });
  if (result.results.some((r) => r.status === "written")) {
    revalidatePath("/data");
    revalidatePath("/data/[slug]", "page");
    revalidatePath("/");
  }
  return NextResponse.json({ ok: true, ...result, pruned, jobs });
}
