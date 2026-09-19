import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAdminApi } from "@/lib/admin-api";
import { reindexAll } from "@/lib/indexers";
import { pruneOldRows, runDueJobs } from "@/lib/jobs";
import { removeSampleContent } from "@/lib/sample-content";
import { runSeed } from "@/lib/seed";
import { backfillRenditions } from "@/lib/storage";

export const dynamic = "force-dynamic";
// Photo imports, ingestion and sends take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

const Body = z.object({
  job: z.enum(["due", "reindex", "prune", "revalidate", "remove-sample", "renditions", "seed"]),
  paths: z.array(z.string().startsWith("/")).max(50).optional(),
  /** seed only: which set, and the admin account to create when the database has none. */
  mode: z.enum(["reference", "sample"]).default("reference"),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).max(128).optional(),
});

/**
 * POST /api/admin/jobs { job: "due" | "reindex" | "prune" | "revalidate", paths? }
 *   due         publish scheduled articles, send due newsletters, claim invites, digests, inbox sync
 *   reindex     rebuild the search index from scratch
 *   prune       the daily housekeeping (old analytics, expired claims, closed posts)
 *   revalidate  purge the page cache for the given paths (or the front page, news, guides, data when omitted)
 *   remove-sample  delete the demonstration articles and businesses from the seed (one-way)
 *   renditions  write any missing 480/960 files for stored images narrower than 960 px
 *   seed        reference data (locations, categories, entities, series, tools, admin) or the sample set; local and CI
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  if (d.job === "due") return { ok: true, ...(await runDueJobs({ force: true })) };
  if (d.job === "reindex") return { ok: true, counts: await reindexAll() };
  if (d.job === "prune") return { ok: true, pruned: await pruneOldRows() };
  if (d.job === "remove-sample") return { ok: true, removed: await removeSampleContent() };
  if (d.job === "renditions") return { ok: true, ...(await backfillRenditions()) };
  if (d.job === "seed") return { ok: true, log: await runSeed({ mode: d.mode, adminEmail: d.adminEmail, adminPassword: d.adminPassword }) };
  const paths = d.paths?.length ? d.paths : ["/", "/news", "/guides", "/data", "/businesses", "/tools"];
  for (const p of paths) revalidatePath(p);
  return { ok: true, revalidated: paths };
});
