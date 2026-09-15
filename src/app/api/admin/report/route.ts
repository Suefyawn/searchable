import { z } from "zod";
import { withAdminApi } from "@/lib/admin-api";
import { addReport, readReports } from "@/lib/automation-reports";

export const dynamic = "force-dynamic";

/** GET /api/admin/report: the last run reports, newest first. */
export const GET = withAdminApi(async () => ({ reports: (await readReports()).slice(0, 20) }));

const Body = z.object({
  slot: z.string().trim().min(2).max(40),
  /** The run's report in markdown, as written for a human. */
  report: z.string().trim().min(10).max(40_000),
  published: z.number().int().nonnegative().optional(),
  updated: z.number().int().nonnegative().optional(),
  errors: z.number().int().nonnegative().optional(),
});

/** POST /api/admin/report { slot, report, published?, updated?, errors? }: file the run's report so it shows in /admin/automation. */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  const saved = await addReport(d);
  return { ok: true, id: saved.id, at: saved.at };
});
