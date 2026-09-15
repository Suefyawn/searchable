import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { users } from "./auth";
import { locations } from "./geo";

/**
 * Community: members post things (jobs, listings, auctions, questions, discussions), everyone comments and
 * likes, editors moderate. Posts wait for approval; comments go up at once and can be hidden. Every member has
 * a public profile at /u/[handle].
 */

export const postKind = pgEnum("post_kind", ["job", "listing", "auction", "question", "discussion"]);
export const postStatus = pgEnum("post_status", ["pending", "published", "rejected", "hidden", "closed"]);
export const commentTarget = pgEnum("comment_target", ["post", "article"]);
export const commentStatus = pgEnum("comment_status", ["published", "pending", "hidden", "deleted"]);
export const reactionTarget = pgEnum("reaction_target", ["post", "comment", "article"]);

export type MemberSocial = { linkedin?: string; x?: string; instagram?: string; facebook?: string; github?: string; website?: string };
export type PostImage = { url: string; alt?: string };
/** Kind-specific fields kept in one JSON column; the zod schema per kind is in src/lib/community-schema.ts. */
export type PostMeta = {
  // job
  company?: string;
  employmentType?: string; // full_time | part_time | contract | internship | remote
  salaryMin?: number;
  salaryMax?: number;
  applyUrl?: string;
  deadline?: string;
  // listing
  price?: number;
  condition?: string; // new | used
  negotiable?: boolean;
  // auction
  startPrice?: number;
  minIncrement?: number;
  endsAt?: string;
  // any
  location?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactEmail?: string;
};

export const memberProfiles = pgTable(
  "member_profiles",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    handle: text("handle").notNull().unique(),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    cityId: text("city_id").references(() => locations.id, { onDelete: "set null" }),
    social: jsonb("social").$type<MemberSocial>().default({}).notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    isBanned: boolean("is_banned").default(false).notNull(),
    /** Editors can mark a member as verified (identity checked) so their posts carry the mark automatically. */
    isVerified: boolean("is_verified").default(false).notNull(),
    postCount: integer("post_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    likesReceived: integer("likes_received").default(0).notNull(),
    /** Daily digest of comments, replies, likes and bids on their things. */
    notifyDigest: boolean("notify_digest").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("member_profiles_handle_idx").on(t.handle)],
);

export const savedTarget = pgEnum("saved_target", ["article", "tool", "business", "professional", "post", "data_series"]);

/** Bookmarks: anything with a URL a member wants to find again. */
export const savedItems = pgTable(
  "saved_items",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: savedTarget("target_type").notNull(),
    targetId: text("target_id").notNull(),
    /** Denormalised so the saved list renders without joins. */
    title: text("title").notNull(),
    url: text("url").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("saved_items_unique_idx").on(t.userId, t.targetType, t.targetId), index("saved_items_user_idx").on(t.userId, t.createdAt)],
);

export const posts = pgTable(
  "posts",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: postKind("kind").notNull(),
    status: postStatus("status").default("pending").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Free tag such as "IT jobs", "Cars", "Furniture", "Cricket". */
    topic: text("topic"),
    cityId: text("city_id").references(() => locations.id, { onDelete: "set null" }),
    images: jsonb("images").$type<PostImage[]>().default([]).notNull(),
    meta: jsonb("meta").$type<PostMeta>().default({}).notNull(),
    /** Verified posting: the author is a verified member, business owner or professional, or an editor marked it. */
    isVerified: boolean("is_verified").default(false).notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    bidCount: integer("bid_count").default(0).notNull(),
    highestBid: integer("highest_bid"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /** Listings and jobs close themselves after this; auctions after meta.endsAt. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    moderationNote: text("moderation_note"),
    moderatedBy: text("moderated_by").references(() => users.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("posts_status_kind_idx").on(t.status, t.kind, t.publishedAt), index("posts_author_idx").on(t.authorId), index("posts_city_idx").on(t.cityId)],
);

export const bids = pgTable(
  "bids",
  {
    id: id(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("bids_post_idx").on(t.postId, t.amount)],
);

export const comments = pgTable(
  "comments",
  {
    id: id(),
    targetType: commentTarget("target_type").notNull(),
    targetId: text("target_id").notNull(),
    parentId: text("parent_id"),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: commentStatus("status").default("published").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    replyCount: integer("reply_count").default(0).notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    moderationNote: text("moderation_note"),
    createdAt: createdAt(),
  },
  (t) => [index("comments_target_idx").on(t.targetType, t.targetId, t.createdAt), index("comments_parent_idx").on(t.parentId), index("comments_author_idx").on(t.authorId)],
);

export const reactions = pgTable(
  "reactions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: reactionTarget("target_type").notNull(),
    targetId: text("target_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reactions_unique_idx").on(t.userId, t.targetType, t.targetId), index("reactions_target_idx").on(t.targetType, t.targetId)],
);
