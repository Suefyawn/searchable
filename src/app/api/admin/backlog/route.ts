import { z } from "zod";
import { ApiError, qs, withAdminApi } from "@/lib/admin-api";
import { BacklogItem, backlogScore, readBacklog, removeBacklog, setBacklogStatus, upsertBacklog } from "@/lib/backlog";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/backlog?status=open|in_progress|done|all
 * Search-demand backlog (Semrush, Pakistan database): keyword, monthly volume, difficulty, what to build,
 * where, and a brief. Sorted by score (volume over difficulty), in-progress first. Take the top open item
 * that fits the run, mark it in_progress, publish, mark it done with the URL.
 */
export const GET = withAdminApi(async (req) => {
  const status = qs(req).str("status", "open");
  const items = await readBacklog();
  return { items: items.filter((i) => status === "all" || i.status === status).map((i) => ({ ...i, score: backlogScore(i) })) };
});

const Body = z.union([
  z.object({ items: z.array(BacklogItem).min(1).max(200) }),
  z.object({ keyword: z.string().min(1), status: z.enum(["open", "in_progress", "done", "dropped"]), url: z.string().max(300).optional(), note: z.string().max(600).optional() }),
  z.object({ keyword: z.string().min(1), remove: z.literal(true) }),
]);

/**
 * POST /api/admin/backlog
 *   { keyword, status: "in_progress" | "done" | "open" | "dropped", url?, note? }
 *   { items: [{ keyword, volume, kd, type, target, brief?, status? }] }   add or replace items
 *   { keyword, remove: true }
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  if ("items" in d) return { ok: true, ...(await upsertBacklog(d.items)) };
  if ("remove" in d) {
    if (!(await removeBacklog(d.keyword))) throw new ApiError(404, "No such backlog item");
    return { ok: true };
  }
  if (!(await setBacklogStatus(d.keyword, { status: d.status, url: d.url, note: d.note }))) throw new ApiError(404, "No such backlog item");
  return { ok: true };
});
