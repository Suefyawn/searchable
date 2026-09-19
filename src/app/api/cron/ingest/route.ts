import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { indexTools } from "@/lib/indexers";
import { runIngestion } from "@/lib/ingest";
import { cronAuthorized, pruneOldRows, runDueJobs } from "@/lib/jobs";

// Ingestion, sends and image processing take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

/**
 * Data-hub ingestion, called by the scheduler Worker (workers/scheduler). Without `only` it is the daily run:
 * every source, then the tools mirror, row pruning and due jobs. With `?only=usd-pkr,gold-24k-tola` it ingests
 * those series alone (the hourly market refresh and the fuel Workflow) and skips the housekeeping.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const only = new URL(req.url).searchParams.get("only")?.split(",").map((s) => s.trim()).filter(Boolean);
  const result = await runIngestion(only?.length ? { only } : {});
  if (only?.length) {
    for (const r of result.results.filter((x) => x.status === "written")) revalidatePath(`/data/${r.slug}`);
    if (result.results.some((x) => x.status === "written")) {
      revalidatePath("/data");
      revalidatePath("/");
    }
    return NextResponse.json({ ok: true, ...result });
  }
  // Calculators live in code; the daily run mirrors the registry into the tools table and search so a deploy
  // that adds one needs no manual reindex.
  await indexTools();
  const pruned = await pruneOldRows();
  const jobs = await runDueJobs({ force: true });
  const written = result.results.filter((r) => r.status === "written");
  if (written.length) {
    for (const r of written) revalidatePath(`/data/${r.slug}`);
    revalidatePath("/data");
    revalidatePath("/");
  }
  return NextResponse.json({ ok: true, ...result, pruned, jobs });
}
