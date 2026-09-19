"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getSessionUser, hasRole, requireRole, requireUser, type SessionUser } from "@/lib/auth";
import { CommentInput, MemberInput, PostInput, type MemberFormInput, type PostFormInput } from "@/lib/community-schema";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { slugify, uniqueSlug } from "@/lib/slug";
import { SITE } from "@/lib/utils";
import { ensureMemberProfile, getMemberByUser, indexPost, isTrustedAuthor } from "./community";
import { notifyOutbid } from "./notify";
import { track } from "./track";

type Result = { ok: boolean; error?: string; id?: string; slug?: string };

async function ensureNotBanned(user: SessionUser): Promise<string | null> {
  const m = await getMemberByUser(user.id);
  return m?.isBanned ? "This account cannot post or comment." : null;
}

/* ───────────── Member profile ───────────── */

export async function saveMemberProfile(raw: MemberFormInput): Promise<Result> {
  const user = await requireUser("/account");
  const parsed = MemberInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  const d = parsed.data;
  const db = await getDb();
  const taken = await db.query.memberProfiles.findFirst({ where: eq(schema.memberProfiles.handle, d.handle), columns: { userId: true } });
  if (taken && taken.userId !== user.id) return { ok: false, error: "That handle is taken." };
  const social = { linkedin: d.linkedin || undefined, x: d.x || undefined, instagram: d.instagram || undefined, facebook: d.facebook || undefined, github: d.github || undefined, website: d.website || undefined };
  await ensureMemberProfile(user);
  await db.update(schema.memberProfiles).set({ handle: d.handle, displayName: d.displayName, bio: d.bio || null, avatarUrl: d.avatarUrl || null, cityId: d.cityId || null, social, isPublic: d.isPublic }).where(eq(schema.memberProfiles.userId, user.id));
  await db.update(schema.users).set({ name: d.displayName, image: d.avatarUrl || null }).where(eq(schema.users.id, user.id));
  revalidatePath(`/u/${d.handle}`);
  revalidatePath("/account");
  return { ok: true };
}

/* ───────────── Posts ───────────── */

function metaFrom(d: z.output<typeof PostInput>) {
  return {
    company: d.company || undefined,
    employmentType: d.employmentType,
    salaryMin: d.salaryMin,
    salaryMax: d.salaryMax,
    applyUrl: d.applyUrl || undefined,
    deadline: d.deadline || undefined,
    price: d.price,
    condition: d.condition,
    negotiable: d.negotiable || undefined,
    startPrice: d.startPrice,
    minIncrement: d.minIncrement,
    endsAt: d.endsAt || undefined,
    location: d.location || undefined,
    contactPhone: d.contactPhone || undefined,
    contactWhatsapp: d.contactWhatsapp || undefined,
    contactEmail: d.contactEmail || undefined,
  };
}

/** Create (pending) or edit a post. Edits to a published post keep it live; editors' posts publish at once. */
export async function savePost(raw: PostFormInput): Promise<Result> {
  const user = await requireUser("/community/new");
  const banned = await ensureNotBanned(user);
  if (banned) return { ok: false, error: banned };
  const parsed = PostInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  const d = parsed.data;
  const db = await getDb();
  const values = { kind: d.kind, title: d.title, body: d.body, topic: d.topic || null, cityId: d.cityId || null, images: d.images, meta: metaFrom(d) };
  const editor = hasRole(user, "editor");

  if (d.id) {
    const before = await db.query.posts.findFirst({ where: eq(schema.posts.id, d.id) });
    if (!before) return { ok: false, error: "Post not found" };
    if (before.authorId !== user.id && !editor) return { ok: false, error: "Not your post" };
    // A member's edit to a live post goes back through the queue, so approval covers what is actually shown.
    const requeue = !editor && before.status === "published";
    await db.update(schema.posts).set({ ...values, ...(requeue ? { status: "pending" as const } : {}) }).where(eq(schema.posts.id, d.id));
    await indexPost(d.id);
    revalidatePath(`/community/post/${before.slug}`);
    return { ok: true, id: d.id, slug: before.slug };
  }

  const rl = await rateLimit(`post:${user.id}`, editor ? 100 : 5, 24 * 3600_000);
  if (!rl.ok) return { ok: false, error: "You have posted a lot today. Try again tomorrow." };
  await ensureMemberProfile(user);
  const slug = await uniqueSlug(slugify(d.title), async (s) => !!(await db.query.posts.findFirst({ where: eq(schema.posts.slug, s), columns: { id: true } })));
  const trusted = editor || (await isTrustedAuthor(user.id));
  const days = d.kind === "job" ? 45 : d.kind === "listing" ? 30 : null;
  const [row] = await db
    .insert(schema.posts)
    .values({ ...values, slug, authorId: user.id, status: editor ? "published" : "pending", isVerified: trusted, publishedAt: editor ? new Date() : null, expiresAt: days ? new Date(Date.now() + days * 86400_000) : null })
    .returning({ id: schema.posts.id });
  await db.update(schema.memberProfiles).set({ postCount: sql`${schema.memberProfiles.postCount} + 1` }).where(eq(schema.memberProfiles.userId, user.id));
  track("community_post", { blobs: [d.kind, d.topic || "", d.cityId || ""] });
  if (editor) await indexPost(row.id);
  revalidatePath("/community");
  revalidatePath("/admin/community");
  return { ok: true, id: row.id, slug };
}

export async function closePost(postId: string): Promise<Result> {
  const user = await requireUser("/account");
  const db = await getDb();
  const p = await db.query.posts.findFirst({ where: eq(schema.posts.id, postId) });
  if (!p) return { ok: false, error: "Post not found" };
  if (p.authorId !== user.id && !hasRole(user, "editor")) return { ok: false, error: "Not your post" };
  await db.update(schema.posts).set({ status: "closed" }).where(eq(schema.posts.id, postId));
  await indexPost(postId);
  revalidatePath(`/community/post/${p.slug}`);
  revalidatePath("/community");
  return { ok: true };
}

/* ───────────── Bids ───────────── */

export async function placeBid(postId: string, amount: number): Promise<Result & { highest?: number }> {
  const user = await requireUser("/community");
  const banned = await ensureNotBanned(user);
  if (banned) return { ok: false, error: banned };
  const rl = await rateLimit(`bid:${user.id}`, 30, 3600_000);
  if (!rl.ok) return { ok: false, error: "Slow down." };
  const db = await getDb();
  const p = await db.query.posts.findFirst({ where: eq(schema.posts.id, postId) });
  if (!p || p.kind !== "auction" || p.status !== "published") return { ok: false, error: "This auction is not open." };
  if (p.authorId === user.id) return { ok: false, error: "You cannot bid on your own auction." };
  if (p.meta.endsAt && Date.parse(p.meta.endsAt) < Date.now()) return { ok: false, error: "This auction has ended." };
  const floor = (p.highestBid ?? (p.meta.startPrice ?? 0) - (p.meta.minIncrement ?? 1)) + (p.meta.minIncrement ?? 1);
  if (!Number.isInteger(amount) || amount < floor) return { ok: false, error: `Bid at least Rs ${floor.toLocaleString()}.` };
  await notifyOutbid(postId, amount, user.id);
  await db.insert(schema.bids).values({ postId, userId: user.id, amount });
  await db.update(schema.posts).set({ highestBid: amount, bidCount: sql`${schema.posts.bidCount} + 1` }).where(eq(schema.posts.id, postId));
  revalidatePath(`/community/post/${p.slug}`);
  return { ok: true, highest: amount };
}

/* ───────────── Comments ───────────── */

export async function addComment(raw: z.input<typeof CommentInput>): Promise<Result> {
  const user = await requireUser("/login");
  const banned = await ensureNotBanned(user);
  if (banned) return { ok: false, error: banned };
  const parsed = CommentInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Write at least a couple of characters." };
  const d = parsed.data;
  const rl = await rateLimit(`comment:${user.id}`, hasRole(user, "editor") ? 200 : 20, 3600_000);
  if (!rl.ok) return { ok: false, error: "Too many comments in the last hour." };
  const db = await getDb();
  if (d.targetType === "post") {
    const p = await db.query.posts.findFirst({ where: eq(schema.posts.id, d.targetId), columns: { status: true } });
    if (!p || (p.status !== "published" && p.status !== "closed")) return { ok: false, error: "Comments are closed here." };
  } else {
    const a = await db.query.articles.findFirst({ where: eq(schema.articles.id, d.targetId), columns: { status: true } });
    if (!a || a.status !== "published") return { ok: false, error: "Comments are closed here." };
  }
  if (d.parentId) {
    const parent = await db.query.comments.findFirst({ where: eq(schema.comments.id, d.parentId), columns: { id: true, targetId: true, parentId: true } });
    if (!parent || parent.targetId !== d.targetId) return { ok: false, error: "Reply target not found" };
    if (parent.parentId) d.parentId = parent.parentId; // one level of nesting: replies to replies attach to the top comment
  }
  await ensureMemberProfile(user);
  // Links from brand-new accounts wait for a look; everything else goes up at once.
  const hasLink = /https?:\/\/|www\./i.test(d.body);
  const status = hasLink && !hasRole(user, "editor") ? "pending" : "published";
  const [row] = await db.insert(schema.comments).values({ targetType: d.targetType, targetId: d.targetId, parentId: d.parentId ?? null, authorId: user.id, body: d.body, status }).returning({ id: schema.comments.id });
  if (d.parentId) await db.update(schema.comments).set({ replyCount: sql`${schema.comments.replyCount} + 1` }).where(eq(schema.comments.id, d.parentId));
  if (status === "published") {
    if (d.targetType === "post") await db.update(schema.posts).set({ commentCount: sql`${schema.posts.commentCount} + 1` }).where(eq(schema.posts.id, d.targetId));
    await db.update(schema.memberProfiles).set({ commentCount: sql`${schema.memberProfiles.commentCount} + 1` }).where(eq(schema.memberProfiles.userId, user.id));
  }
  if (d.path) revalidatePath(d.path);
  return { ok: true, id: row.id, error: status === "pending" ? "Your comment contains a link, so an editor will check it before it appears." : undefined };
}

export async function deleteOwnComment(commentId: string, path?: string): Promise<Result> {
  const user = await requireUser("/login");
  const db = await getDb();
  const c = await db.query.comments.findFirst({ where: eq(schema.comments.id, commentId) });
  if (!c) return { ok: false, error: "Not found" };
  if (c.authorId !== user.id && !hasRole(user, "editor")) return { ok: false, error: "Not yours" };
  await db.update(schema.comments).set({ status: "deleted", body: "" }).where(eq(schema.comments.id, commentId));
  if (c.targetType === "post" && c.status === "published") await db.update(schema.posts).set({ commentCount: sql`max(${schema.posts.commentCount} - 1, 0)` }).where(eq(schema.posts.id, c.targetId));
  if (path) revalidatePath(path);
  return { ok: true };
}

/* ───────────── Likes ───────────── */

export async function toggleLike(targetType: "post" | "comment" | "article", targetId: string, path?: string): Promise<{ ok: boolean; liked?: boolean; count?: number; error?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to like." };
  if (!z.enum(["post", "comment", "article"]).safeParse(targetType).success) return { ok: false, error: "Bad target" };
  const db = await getDb();
  const existing = await db.query.reactions.findFirst({ where: and(eq(schema.reactions.userId, user.id), eq(schema.reactions.targetType, targetType), eq(schema.reactions.targetId, targetId)) });
  let liked: boolean;
  if (existing) {
    await db.delete(schema.reactions).where(eq(schema.reactions.id, existing.id));
    liked = false;
  } else {
    await db.insert(schema.reactions).values({ userId: user.id, targetType, targetId }).onConflictDoNothing();
    liked = true;
  }
  const count = await db.$count(schema.reactions, and(eq(schema.reactions.targetType, targetType), eq(schema.reactions.targetId, targetId)));
  if (targetType === "post") {
    await db.update(schema.posts).set({ likeCount: count }).where(eq(schema.posts.id, targetId));
    const p = await db.query.posts.findFirst({ where: eq(schema.posts.id, targetId), columns: { authorId: true } });
    if (p) await db.update(schema.memberProfiles).set({ likesReceived: sql`max(${schema.memberProfiles.likesReceived} + ${liked ? 1 : -1}, 0)` }).where(eq(schema.memberProfiles.userId, p.authorId));
  }
  if (targetType === "comment") {
    await db.update(schema.comments).set({ likeCount: count }).where(eq(schema.comments.id, targetId));
  }
  if (path) revalidatePath(path);
  return { ok: true, liked, count };
}

/* ───────────── Reports (any signed-in or anonymous visitor) ───────────── */

const Report = z.object({ targetType: z.enum(["post", "comment", "member"]), targetId: z.string().min(1), reason: z.enum(["spam", "scam", "abuse", "wrong", "other"]), details: z.string().trim().max(600).optional() });

export async function reportContent(raw: z.input<typeof Report>): Promise<Result> {
  const parsed = Report.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Pick a reason." };
  const rl = await rateLimit("report", 10, 3600_000);
  if (!rl.ok) return { ok: false, error: "Too many reports." };
  const user = await getSessionUser();
  const db = await getDb();
  await db.insert(schema.reports).values({ targetType: parsed.data.targetType, targetId: parsed.data.targetId, reason: parsed.data.reason, details: parsed.data.details || null, reporterUserId: user?.id ?? null, reporterEmail: user?.email ?? null });
  return { ok: true };
}

/* ───────────── Moderation (editors) ───────────── */

export async function moderatePost(formData: FormData) {
  const user = await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  const db = await getDb();
  const p = await db.query.posts.findFirst({ where: eq(schema.posts.id, id), with: { author: { columns: { email: true, name: true } } } });
  if (!p) return;
  const now = new Date();
  if (action === "approve") {
    await db.update(schema.posts).set({ status: "published", publishedAt: p.publishedAt ?? now, moderatedBy: user.id, moderatedAt: now, moderationNote: note }).where(eq(schema.posts.id, id));
    await sendEmail({ to: p.author.email, subject: `Your post is live: ${p.title}`, html: `<p>Your ${p.kind} is now on ${SITE.name}: <a href="${SITE.url}/community/post/${p.slug}">${SITE.url}/community/post/${p.slug}</a></p>`, text: `Your post is live: ${SITE.url}/community/post/${p.slug}` }).catch(() => {});
  } else if (action === "reject") {
    await db.update(schema.posts).set({ status: "rejected", moderatedBy: user.id, moderatedAt: now, moderationNote: note }).where(eq(schema.posts.id, id));
    await sendEmail({ to: p.author.email, subject: `About your post: ${p.title}`, html: `<p>We could not publish this post.${note ? ` ${note}` : ""} You can edit it from your account and resubmit.</p>`, text: `We could not publish your post. ${note ?? ""}` }).catch(() => {});
  } else if (action === "hide") {
    await db.update(schema.posts).set({ status: "hidden", moderatedBy: user.id, moderatedAt: now, moderationNote: note }).where(eq(schema.posts.id, id));
  } else if (action === "verify") {
    await db.update(schema.posts).set({ isVerified: !p.isVerified }).where(eq(schema.posts.id, id));
  } else if (action === "pin") {
    await db.update(schema.posts).set({ isPinned: !p.isPinned }).where(eq(schema.posts.id, id));
  }
  await indexPost(id);
  revalidatePath("/community");
  revalidatePath(`/community/post/${p.slug}`);
  revalidatePath("/admin/community");
  revalidatePath("/admin");
}

export async function moderateComment(formData: FormData) {
  await requireRole("editor");
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const db = await getDb();
  const c = await db.query.comments.findFirst({ where: eq(schema.comments.id, id) });
  if (!c) return;
  const status = action === "approve" ? "published" : action === "hide" ? "hidden" : action === "delete" ? "deleted" : null;
  if (!status) return;
  await db.update(schema.comments).set({ status }).where(eq(schema.comments.id, id));
  if (c.targetType === "post") {
    const n = await db.$count(schema.comments, and(eq(schema.comments.targetType, "post"), eq(schema.comments.targetId, c.targetId), eq(schema.comments.status, "published")));
    await db.update(schema.posts).set({ commentCount: n }).where(eq(schema.posts.id, c.targetId));
  }
  revalidatePath("/admin/community");
  revalidatePath("/admin");
}

export async function moderateMember(formData: FormData) {
  await requireRole("editor");
  const userId = String(formData.get("userId") ?? "");
  const action = String(formData.get("action") ?? "");
  const db = await getDb();
  if (action === "ban" || action === "unban") await db.update(schema.memberProfiles).set({ isBanned: action === "ban" }).where(eq(schema.memberProfiles.userId, userId));
  if (action === "verify" || action === "unverify") await db.update(schema.memberProfiles).set({ isVerified: action === "verify" }).where(eq(schema.memberProfiles.userId, userId));
  if (action === "ban") {
    // A banned member's live content comes down with them.
    await db.update(schema.posts).set({ status: "hidden" }).where(and(eq(schema.posts.authorId, userId), eq(schema.posts.status, "published")));
    await db.update(schema.comments).set({ status: "hidden" }).where(and(eq(schema.comments.authorId, userId), eq(schema.comments.status, "published")));
  }
  revalidatePath("/admin/community");
}
