import { z } from "zod";
import { assetUrl, webUrl } from "./url-fields";

export const POST_KINDS = [
  { key: "job", label: "Job", plural: "Jobs", blurb: "Hiring? Post the role, pay and how to apply." },
  { key: "listing", label: "Listing", plural: "Listings", blurb: "Sell or rent something: price, condition, photos." },
  { key: "auction", label: "Auction", plural: "Auctions", blurb: "Start a price, set an end time, take bids." },
  { key: "question", label: "Question", plural: "Questions", blurb: "Ask Pakistan: taxes, documents, prices, where to find things." },
  { key: "discussion", label: "Discussion", plural: "Discussions", blurb: "Anything worth talking about." },
] as const;
export type PostKindKey = (typeof POST_KINDS)[number]["key"];
export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship", "remote"] as const;

const money = z.coerce.number().int().nonnegative().max(1_000_000_000).optional();
const handleField = z.string().trim().max(200).optional();

export const PostInput = z
  .object({
    id: z.string().optional(),
    kind: z.enum(["job", "listing", "auction", "question", "discussion"]),
    title: z.string().trim().min(8).max(140),
    body: z.string().trim().min(20).max(12_000),
    topic: z.string().trim().max(40).optional(),
    cityId: z.string().optional(),
    images: z.array(z.object({ url: assetUrl, alt: z.string().max(200).optional() })).max(8).default([]),
    // job
    company: z.string().trim().max(120).optional(),
    employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
    salaryMin: money,
    salaryMax: money,
    applyUrl: webUrl.optional(),
    deadline: z.string().trim().max(10).optional(),
    // listing
    price: money,
    condition: z.enum(["new", "used"]).optional(),
    negotiable: z.boolean().default(false),
    // auction
    startPrice: money,
    minIncrement: money,
    endsAt: z.string().trim().max(30).optional(),
    // contact
    location: z.string().trim().max(160).optional(),
    contactPhone: z.string().trim().max(20).optional(),
    contactWhatsapp: z.string().trim().max(20).optional(),
    contactEmail: z.string().trim().max(120).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.kind === "job" && !d.company) ctx.addIssue({ code: "custom", path: ["company"], message: "Name the employer" });
    if (d.kind === "listing" && d.price === undefined) ctx.addIssue({ code: "custom", path: ["price"], message: "Give a price (0 for free)" });
    if (d.kind === "auction") {
      if (!d.startPrice) ctx.addIssue({ code: "custom", path: ["startPrice"], message: "Set a starting price" });
      if (!d.endsAt || Number.isNaN(Date.parse(d.endsAt)) || Date.parse(d.endsAt) < Date.now() + 3600_000) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be at least an hour away" });
    }
    if ((d.kind === "listing" || d.kind === "auction" || d.kind === "job") && !d.contactPhone && !d.contactWhatsapp && !d.contactEmail && !d.applyUrl) ctx.addIssue({ code: "custom", path: ["contactPhone"], message: "Give at least one way to reach you" });
  });
export type PostFormInput = z.input<typeof PostInput>;
export type PostFormValues = z.output<typeof PostInput>;

export const CommentInput = z.object({
  targetType: z.enum(["post", "article"]),
  targetId: z.string().min(1),
  parentId: z.string().optional(),
  body: z.string().trim().min(2).max(3000),
  /** Where to revalidate after posting. */
  path: z.string().max(300).optional(),
});

export const MemberInput = z.object({
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_.-]{2,29}$/, "3 to 30 characters: letters, numbers, dots, dashes, underscores"),
  displayName: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(600).optional(),
  avatarUrl: assetUrl.optional(),
  cityId: z.string().optional(),
  website: handleField,
  linkedin: handleField,
  x: handleField,
  instagram: handleField,
  facebook: handleField,
  github: handleField,
  isPublic: z.boolean().default(true),
});
export type MemberFormInput = z.input<typeof MemberInput>;
