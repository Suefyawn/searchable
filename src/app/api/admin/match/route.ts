import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, withAdminApi } from "@/lib/admin-api";
import { groupMatches, Match, readMatches, writeMatches } from "@/lib/match-today";

export const dynamic = "force-dynamic";

/** GET /api/admin/match: every fixture on file, grouped for today, live, upcoming and recent. */
export const GET = withAdminApi(async () => {
  const set = await readMatches();
  return { updatedAt: set.updatedAt ?? null, matches: set.matches, ...groupMatches(set) };
});

const Body = z.object({
  /** The full list to keep: today's fixtures, the next week's, and yesterday's results. Fixtures older than 36 hours are dropped by the pages anyway. */
  matches: z.array(Match).max(30),
});

/**
 * POST /api/admin/match { matches: [{ id, title, competition, format?, venue?, startAt, status, score?, result?, watch?, href?, sourceUrl }] }
 * Replaces the whole list (send everything you want shown). Set status "live" with a score while a match is on,
 * "finished" with the result after; the ticker and /cricket-today update at once.
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  let saved;
  try {
    saved = await writeMatches(d.matches);
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
  revalidatePath("/cricket-today");
  revalidatePath("/today");
  revalidatePath("/");
  return { ok: true, matches: saved.matches.length, ...groupMatches(saved) };
});
