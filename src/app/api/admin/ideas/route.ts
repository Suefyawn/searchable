import { qs, withAdminApi } from "@/lib/admin-api";
import { fetchPress, type PressTopic } from "@/lib/press";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/ideas?topic=general|business|tech|world|cricket|entertainment|markets|crypto|us|mma|snooker&region=pk|world&limit=60
 * Headlines from the press feeds (title, source, URL, time). Material for the Searchable angle: what it means
 * for readers, with numbers, a calculator or a guide. Never reproduce the source text.
 */
export const GET = withAdminApi(async (req) => {
  const q = qs(req);
  const topic = q.str("topic");
  const region = q.str("region") as "pk" | "world" | undefined;
  const items = await fetchPress({ limit: q.int("limit", 60, 150), topics: topic ? [topic as PressTopic] : undefined, region });
  return { headlines: items };
});
