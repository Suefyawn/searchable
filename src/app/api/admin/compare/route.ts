import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, qs, withAdminApi } from "@/lib/admin-api";
import { LIVING_SLUGS, LivingSet, readLivingSet, writeLivingSet } from "@/lib/compare-data";

export const dynamic = "force-dynamic";

/** GET /api/admin/compare?slug=air-conditioners: the current items, review date and source. */
export const GET = withAdminApi(async (req) => {
  const slug = qs(req).str("slug", "") ?? "";
  if (!(LIVING_SLUGS as readonly string[]).includes(slug)) throw new ApiError(400, `slug must be one of ${LIVING_SLUGS.join(", ")}`);
  return { slug, ...(await readLivingSet(slug as (typeof LIVING_SLUGS)[number])) };
});

const Body = LivingSet.omit({ updatedAt: true }).extend({ slug: z.enum(LIVING_SLUGS) });

/**
 * POST /api/admin/compare { slug, items: [...], reviewedAt: "YYYY-MM-DD", source: { title, url?, publisher? } }
 * Replaces the whole set for that comparison (send every item each time). Item shape in src/lib/compare-data.ts;
 * air-conditioners need specs.tonnage and specs.inverter, credit-cards need specs.bank and specs.network.
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  const { slug, ...set } = d;
  let saved;
  try {
    saved = await writeLivingSet(slug, set);
  } catch (e) {
    throw new ApiError(400, (e as Error).message);
  }
  revalidatePath(`/compare/${slug}`);
  revalidatePath("/compare");
  return { ok: true, slug, items: saved.items.length, reviewedAt: saved.reviewedAt ?? null };
});
