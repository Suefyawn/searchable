import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAdminApi } from "@/lib/admin-api";
import { reindexAll } from "@/lib/indexers";
import { pruneOldRows, runDueJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";
// Photo imports, ingestion and sends take longer than the 10 s default; Hobby allows up to 60.
export const maxDuration = 60;

const Body = z.object({ job: z.enum(["due", "reindex", "prune", "revalidate"]), paths: z.array(z.string().startsWith("/")).max(50).optional() });

/**
 * POST /api/admin/jobs { job: "due" | "reindex" | "prune" | "revalidate", paths? }
 *   due         publish scheduled articles, send due newsletters, claim invites, digests, inbox sync
 *   reindex     rebuild the search index from scratch
 *   prune       the daily housekeeping (old analytics, expired claims, closed posts)
 *   revalidate  purge the page cache for the given paths (or the front page, news, guides, data when omitted)
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  if (d.job === "due") return { ok: true, ...(await runDueJobs({ force: true })) };
  if (d.job === "reindex") return { ok: true, counts: await reindexAll() };
  if (d.job === "prune") return { ok: true, pruned: await pruneOldRows() };
  const paths = d.paths?.length ? d.paths : ["/", "/news", "/guides", "/data", "/businesses", "/tools"];
  for (const p of paths) revalidatePath(p);
  return { ok: true, revalidated: paths };
});
