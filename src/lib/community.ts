import { and, asc, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { getDb, rawQuery, schema } from "@/db";
import type { SessionUser } from "./auth";
import { POST_KINDS, type PostKindKey } from "./community-schema";
import { removeSearchDocument, syncSearchDocument } from "./search";
import { slugify, uniqueSlug } from "./slug";

/** Read side for the community: posts, comments, members, plus the search indexer. */

export type PostRow = typeof schema.posts.$inferSelect & { author: { id: string; name: string; image: string | null }; city: { name: string; slug: string } | null };

export function kindLabel(kind: PostKindKey, plural = false) {
  const k = POST_KINDS.find((x) => x.key === kind);
  return k ? (plural ? k.plural : k.label) : kind;
}

export async function listPosts(opts: { kind?: PostKindKey; citySlug?: string; topic?: string; authorId?: string; status?: "published" | "all"; sort?: "new" | "top"; limit?: number; offset?: number } = {}) {
  const db = await getDb();
  let cityId: string | undefined;
  if (opts.citySlug) {
    const city = await db.query.locations.findFirst({ where: and(eq(schema.locations.slug, opts.citySlug), eq(schema.locations.kind, "city")), columns: { id: true } });
    if (!city) return { rows: [] as PostRow[], total: 0 };
    cityId = city.id;
  }
  const where = and(
    opts.status === "all" ? undefined : eq(schema.posts.status, "published"),
    opts.kind ? eq(schema.posts.kind, opts.kind) : undefined,
    cityId ? eq(schema.posts.cityId, cityId) : undefined,
    opts.topic ? eq(schema.posts.topic, opts.topic) : undefined,
    opts.authorId ? eq(schema.posts.authorId, opts.authorId) : undefined,
  );
  const order = opts.sort === "top" ? [desc(schema.posts.isPinned), desc(schema.posts.likeCount), desc(schema.posts.commentCount), desc(schema.posts.publishedAt)] : [desc(schema.posts.isPinned), desc(schema.posts.publishedAt), desc(schema.posts.createdAt)];
  const [rows, total] = await Promise.all([
    db.query.posts.findMany({ where, orderBy: order, limit: Math.min(opts.limit ?? 30, 100), offset: opts.offset ?? 0, with: { author: { columns: { id: true, name: true, image: true } }, city: { columns: { name: true, slug: true } } } }),
    db.$count(schema.posts, where),
  ]);
  return { rows: rows as PostRow[], total };
}

export async function getPost(slug: string) {
  const db = await getDb();
  const p = await db.query.posts.findFirst({ where: eq(schema.posts.slug, slug), with: { author: { columns: { id: true, name: true, image: true } }, city: { columns: { name: true, slug: true } }, bids: { orderBy: [desc(schema.bids.amount)], limit: 10, with: { user: { columns: { id: true, name: true } } } } } });
  return p ?? null;
}

export async function postCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await rawQuery<{ kind: string; n: number }>(db, sql`select kind, count(*)::int as n from posts where status = 'published' group by kind`);
  return Object.fromEntries(rows.map((r) => [r.kind, Number(r.n)]));
}

export async function postTopics(kind?: PostKindKey, limit = 12) {
  const db = await getDb();
  return rawQuery<{ topic: string; n: number }>(db, sql`select topic, count(*)::int as n from posts where status = 'published' and topic is not null and topic <> '' ${kind ? sql`and kind = ${kind}` : sql``} group by topic order by n desc limit ${limit}`);
}

/* ───────────── Comments ───────────── */

export type CommentRow = typeof schema.comments.$inferSelect & { author: { id: string; name: string; image: string | null }; replies: CommentRow[]; handle?: string | null };

/** Top-level comments (newest first) with their replies (oldest first). Hidden and deleted rows are dropped unless `all`. */
export async function listComments(targetType: "post" | "article", targetId: string, opts: { all?: boolean; limit?: number } = {}): Promise<CommentRow[]> {
  const db = await getDb();
  const visible = opts.all ? undefined : eq(schema.comments.status, "published");
  const rows = await db.query.comments.findMany({
    where: and(eq(schema.comments.targetType, targetType), eq(schema.comments.targetId, targetId), visible),
    orderBy: [asc(schema.comments.createdAt)],
    limit: Math.min(opts.limit ?? 300, 500),
    with: { author: { columns: { id: true, name: true, image: true } } },
  });
  const handles = await memberHandles(rows.map((r) => r.authorId));
  const byId = new Map<string, CommentRow>();
  for (const r of rows) byId.set(r.id, { ...r, replies: [], handle: handles.get(r.authorId) ?? null });
  const top: CommentRow[] = [];
  for (const c of byId.values()) {
    if (c.parentId && byId.has(c.parentId)) byId.get(c.parentId)!.replies.push(c);
    else top.push(c);
  }
  return top.reverse();
}

/** Which of these targets the user has liked. */
export async function likedSet(userId: string | null | undefined, targetType: "post" | "comment" | "article", ids: string[]): Promise<Set<string>> {
  if (!userId || !ids.length) return new Set();
  const db = await getDb();
  const rows = await db.select({ id: schema.reactions.targetId }).from(schema.reactions).where(and(eq(schema.reactions.userId, userId), eq(schema.reactions.targetType, targetType), inArray(schema.reactions.targetId, ids)));
  return new Set(rows.map((r) => r.id));
}

export async function reactionCount(targetType: "post" | "comment" | "article", targetId: string): Promise<number> {
  const db = await getDb();
  return db.$count(schema.reactions, and(eq(schema.reactions.targetType, targetType), eq(schema.reactions.targetId, targetId)));
}

/* ───────────── Members ───────────── */

export async function memberHandles(userIds: string[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(userIds));
  if (!ids.length) return new Map();
  const db = await getDb();
  const rows = await db.select({ userId: schema.memberProfiles.userId, handle: schema.memberProfiles.handle }).from(schema.memberProfiles).where(inArray(schema.memberProfiles.userId, ids));
  return new Map(rows.map((r) => [r.userId, r.handle]));
}

export async function getMemberByHandle(handle: string) {
  const db = await getDb();
  return db.query.memberProfiles.findFirst({ where: eq(schema.memberProfiles.handle, handle.toLowerCase()), with: { user: { columns: { id: true, name: true, image: true, createdAt: true, role: true } }, city: { columns: { name: true, slug: true } } } });
}

export async function getMemberByUser(userId: string) {
  const db = await getDb();
  return db.query.memberProfiles.findFirst({ where: eq(schema.memberProfiles.userId, userId), with: { city: { columns: { name: true, slug: true } } } });
}

/** Every member gets a handle on first write, derived from their name, so profiles and bylines always resolve. */
export async function ensureMemberProfile(user: SessionUser) {
  const db = await getDb();
  const existing = await db.query.memberProfiles.findFirst({ where: eq(schema.memberProfiles.userId, user.id) });
  if (existing) return existing;
  const base = slugify(user.name || user.email.split("@")[0]).replace(/-/g, "_").slice(0, 24) || "member";
  const handle = await uniqueSlug(base, async (h) => !!(await db.query.memberProfiles.findFirst({ where: eq(schema.memberProfiles.handle, h), columns: { id: true } })));
  const [row] = await db.insert(schema.memberProfiles).values({ userId: user.id, handle, displayName: user.name || handle, avatarUrl: user.image ?? null }).returning();
  return row;
}

/** A member's linked business listings and professional profiles, for the public profile. */
export async function memberLinks(userId: string) {
  const db = await getDb();
  const [businesses, pros] = await Promise.all([
    db.query.businesses.findMany({ where: and(eq(schema.businesses.ownerUserId, userId), eq(schema.businesses.status, "active")), columns: { name: true, slug: true, isVerified: true }, limit: 5 }),
    db.query.professionals.findMany({ where: and(eq(schema.professionals.ownerUserId, userId), eq(schema.professionals.status, "active")), columns: { name: true, slug: true, isVerified: true, professionSlug: true }, limit: 5 }),
  ]);
  return { businesses, pros };
}

/** Whether posts by this user should carry the verified mark: verified member, verified business or professional. */
export async function isTrustedAuthor(userId: string): Promise<boolean> {
  const db = await getDb();
  const [m, b, p] = await Promise.all([
    db.query.memberProfiles.findFirst({ where: and(eq(schema.memberProfiles.userId, userId), eq(schema.memberProfiles.isVerified, true)), columns: { id: true } }),
    db.query.businesses.findFirst({ where: and(eq(schema.businesses.ownerUserId, userId), eq(schema.businesses.isVerified, true)), columns: { id: true } }),
    db.query.professionals.findFirst({ where: and(eq(schema.professionals.ownerUserId, userId), eq(schema.professionals.isVerified, true)), columns: { id: true } }),
  ]);
  return !!(m || b || p);
}

/* ───────────── Housekeeping ───────────── */

/** Listings and jobs past their expiry, auctions past their end: closed by the daily job. */
export async function closeExpiredPosts(): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .update(schema.posts)
    .set({ status: "closed" })
    .where(and(eq(schema.posts.status, "published"), or(lt(schema.posts.expiresAt, now), and(eq(schema.posts.kind, "auction"), sql`(meta->>'endsAt')::timestamptz < now()`))))
    .returning({ id: schema.posts.id });
  for (const r of rows) await removeSearchDocument("post", r.id);
  return rows.length;
}

/* ───────────── Search ───────────── */

export async function indexPost(id: string) {
  const db = await getDb();
  const p = await db.query.posts.findFirst({ where: eq(schema.posts.id, id), with: { city: true, author: { columns: { name: true } } } });
  if (!p) return;
  if (p.status !== "published") {
    await removeSearchDocument("post", p.id);
    return;
  }
  const label = kindLabel(p.kind);
  await syncSearchDocument({
    entityType: "post",
    entityId: p.id,
    url: `/community/post/${p.slug}`,
    title: p.title,
    summary: [label, p.topic, p.city?.name, p.meta.company, p.meta.price !== undefined ? `Rs ${p.meta.price.toLocaleString()}` : null].filter(Boolean).join(" · "),
    body: p.body,
    keywords: [label, kindLabel(p.kind, true), p.topic, p.meta.company, p.meta.employmentType?.replace("_", " "), p.meta.condition, p.author.name].filter(Boolean).join(", "),
    category: label,
    categorySlug: p.kind,
    city: p.city?.name ?? null,
    citySlug: p.city?.slug ?? null,
    imageUrl: p.images[0]?.url ?? null,
    popularity: p.likeCount * 3 + p.commentCount * 2 + p.viewCount,
    publishedAt: p.publishedAt,
    meta: { kind: p.kind, price: p.meta.price, verified: p.isVerified },
  });
}

