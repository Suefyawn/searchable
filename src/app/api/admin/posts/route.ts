import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { ApiError, qs, resolveCityId, withAdminApi } from "@/lib/admin-api";
import { closePost, savePost } from "@/lib/community-actions";
import { EMPLOYMENT_TYPES } from "@/lib/community-schema";

export const dynamic = "force-dynamic";

/** GET /api/admin/posts?kind=job&limit=100: published posts (newest first) so the task never posts a vacancy twice. */
export const GET = withAdminApi(async (req) => {
  const q = qs(req);
  const kind = q.str("kind", "job") ?? "job";
  const db = await getDb();
  const rows = await db.query.posts.findMany({
    where: sql`${schema.posts.kind} = ${kind} and ${schema.posts.status} = 'published'`,
    orderBy: [desc(schema.posts.publishedAt)],
    limit: q.int("limit", 100, 500),
    columns: { id: true, slug: true, title: true, topic: true, meta: true, publishedAt: true, expiresAt: true },
  });
  return { kind, posts: rows.map((r) => ({ id: r.id, slug: r.slug, title: r.title, topic: r.topic, url: `/community/post/${r.slug}`, company: (r.meta as { company?: string })?.company ?? null, deadline: (r.meta as { deadline?: string })?.deadline ?? null, publishedAt: r.publishedAt, expiresAt: r.expiresAt })) };
});

const JobBody = z.object({
  kind: z.literal("job").default("job"),
  title: z.string().trim().min(8).max(140),
  /** Markdown: what the role is, who qualifies, pay and allowances, how and where to apply, the closing date. 60 to 400 words. */
  body: z.string().trim().min(20).max(12_000),
  company: z.string().trim().min(2).max(120),
  city: z.string().trim().max(80).optional(),
  topic: z.string().trim().max(40).optional(),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  /** The official advertisement or application page. Required: a vacancy without a source is not posted. */
  applyUrl: z.string().url().max(300),
  /** Closing date, YYYY-MM-DD. */
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  location: z.string().trim().max(160).optional(),
});

const Close = z.object({ id: z.string().min(1), intent: z.literal("close") });

/**
 * POST /api/admin/posts
 *   { kind: "job", title, body, company, city?, topic?, employmentType?, salaryMin?, salaryMax?, applyUrl, deadline?, location? }
 *     publishes a vacancy as the desk (published at once, marked verified). Only from official notices: FPSC,
 *     PPSC, SPSC, KPPSC, NTS, the armed forces' recruitment pages, a bank's or company's own careers page.
 *   { id, intent: "close" }   closes a vacancy whose date has passed or that was withdrawn.
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const raw = body as { intent?: string };
  if (raw?.intent === "close") {
    const d = Close.parse(body);
    const r = await closePost(d.id);
    if (!r.ok) throw new ApiError(400, r.error ?? "Could not close");
    return { ok: true, id: d.id, status: "closed" };
  }
  const d = JobBody.parse(body);
  const cityId = await resolveCityId(d.city);
  const r = await savePost({ ...d, cityId: cityId ?? undefined, images: [], negotiable: false });
  if (!r.ok) throw new ApiError(400, r.error ?? "Could not post");
  const db = await getDb();
  const row = await db.query.posts.findFirst({ where: eq(schema.posts.id, r.id!), columns: { slug: true, status: true } });
  return { ok: true, id: r.id, status: row?.status ?? "published", url: `/community/post/${row?.slug ?? r.slug}` };
});
