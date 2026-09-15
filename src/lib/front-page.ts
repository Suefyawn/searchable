import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import type { ArticleListItem } from "@/db/queries/content";

/*
 * What leads the site. Everything here is optional: with nothing set, the homepage hero and the news front
 * take the newest featured story (48 hours), then the newest stories with photos. An editor (or the task,
 * through POST /api/admin/front) can override any of it from /admin/front-page:
 *  - a lead story, for a number of hours
 *  - stories pinned into the hero after the lead, in order
 *  - a breaking bar across every page, with a link and an expiry
 * Stored in one settings row; every write revalidates the home page, the news front and the layout.
 */

export const Breaking = z.object({
  text: z.string().trim().min(3).max(160),
  href: z.string().trim().max(300).optional().or(z.literal("")),
  until: z.string().datetime().optional(),
});
export const FrontPage = z.object({
  leadId: z.string().nullable().optional(),
  leadUntil: z.string().datetime().nullable().optional(),
  pins: z.array(z.string()).max(6).default([]),
  breaking: Breaking.nullable().optional(),
  updatedAt: z.string().optional(),
});
export type FrontPageT = z.infer<typeof FrontPage>;
export type BreakingT = z.infer<typeof Breaking>;

const KEY = "front:page";
/** A story marked featured leads automatically for this long, then the newest story takes over. */
export const FEATURED_LEAD_HOURS = 48;

export async function readFrontPage(): Promise<FrontPageT> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, KEY) });
  const parsed = FrontPage.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : { pins: [] };
}

export async function writeFrontPage(patch: Partial<FrontPageT>): Promise<FrontPageT> {
  const db = await getDb();
  const current = await readFrontPage();
  const value: FrontPageT = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.insert(schema.settings).values({ key: KEY, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  return value;
}

const live = (until?: string | null, now = Date.now()) => !until || new Date(until).getTime() > now;

/** The breaking bar if one is set and has not expired. */
export function activeBreaking(front: FrontPageT, now = Date.now()): BreakingT | null {
  return front.breaking && live(front.breaking.until, now) ? front.breaking : null;
}

/**
 * The hero order: the manual lead while it lasts, else the newest featured story published within 48 hours,
 * else the newest story; then the pinned stories in order; then the rest, newest first. `byId` supplies the
 * pinned and lead stories, which may be older than `latest` reaches.
 */
export function resolveFront(front: FrontPageT, latest: ArticleListItem[], byId: Map<string, ArticleListItem>, now = Date.now()): { lead: ArticleListItem | null; ordered: ArticleListItem[]; leadSource: "manual" | "featured" | "latest" | "none" } {
  let lead: ArticleListItem | null = null;
  let leadSource: "manual" | "featured" | "latest" | "none" = "none";
  if (front.leadId && live(front.leadUntil, now) && byId.get(front.leadId)) {
    lead = byId.get(front.leadId)!;
    leadSource = "manual";
  } else {
    const featured = latest.find((a) => a.isFeatured && a.publishedAt && now - a.publishedAt.getTime() < FEATURED_LEAD_HOURS * 3_600_000);
    if (featured) {
      lead = featured;
      leadSource = "featured";
    } else if (latest[0]) {
      lead = latest[0];
      leadSource = "latest";
    }
  }
  const seen = new Set<string>();
  const ordered: ArticleListItem[] = [];
  const push = (a: ArticleListItem | undefined | null) => {
    if (a && !seen.has(a.id)) {
      seen.add(a.id);
      ordered.push(a);
    }
  };
  push(lead);
  for (const id of front.pins) push(byId.get(id));
  for (const a of latest) push(a);
  return { lead, ordered, leadSource };
}
