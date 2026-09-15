import { z } from "zod";
import { withAdminApi } from "@/lib/admin-api";
import { setBreaking, setFeatured, setLead, setPins } from "@/app/admin/front-page/actions";
import { readFrontPage } from "@/lib/front-page";

export const dynamic = "force-dynamic";

const Body = z.object({
  /** Story id to lead the homepage and the news front, or null to hand back to automatic. */
  leadId: z.string().nullable().optional(),
  leadHours: z.number().min(1).max(168).optional(),
  /** Ordered story ids pinned into the hero after the lead (max 6); [] clears. */
  pins: z.array(z.string()).max(6).optional(),
  /** Breaking bar across every page; null clears. */
  breaking: z.object({ text: z.string().min(3).max(160), href: z.string().max(300).optional(), hours: z.number().min(0.5).max(72).optional() }).nullable().optional(),
  /** Set the featured flag on one story (clears it on the others). */
  featured: z.object({ id: z.string(), on: z.boolean().default(true) }).optional(),
});

/** GET /api/admin/front: the current lead, pins and breaking bar. */
export const GET = withAdminApi(async () => ({ front: await readFrontPage() }));

/**
 * POST /api/admin/front { leadId?, leadHours?, pins?, breaking?, featured? }: any combination; each part is
 * applied in turn and the final state returned. The same controls as /admin/front-page.
 */
export const POST = withAdminApi(async (_req, { body }) => {
  const d = Body.parse(body);
  const errors: string[] = [];
  if (d.featured) {
    const r = await setFeatured(d.featured.id, d.featured.on);
    if (!r.ok) errors.push(r.error ?? "featured failed");
  }
  if (d.leadId !== undefined) {
    const r = await setLead({ id: d.leadId, hours: d.leadHours });
    if (!r.ok) errors.push(r.error ?? "lead failed");
  }
  if (d.pins) {
    const r = await setPins(d.pins);
    if (!r.ok) errors.push(r.error ?? "pins failed");
  }
  if (d.breaking !== undefined) {
    const r = await setBreaking(d.breaking);
    if (!r.ok) errors.push(r.error ?? "breaking failed");
  }
  return { ok: !errors.length, ...(errors.length ? { errors } : {}), front: await readFrontPage() };
});
