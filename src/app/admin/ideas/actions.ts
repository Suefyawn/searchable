"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { slugify, uniqueSlug } from "@/lib/slug";

const Input = z.object({ title: z.string().trim().min(5).max(200), url: z.string().url(), source: z.string().trim().max(80), topic: z.string().trim().max(30), region: z.enum(["pk", "world"]).default("pk") });

/** Press topic + region → our news category slug. */
function categoryFor(topic: string, region: string): string {
  if (["cricket", "mma", "snooker", "markets", "crypto", "us"].includes(topic)) return topic;
  if (topic === "entertainment") return "entertainment";
  if (topic === "tech") return "technology";
  if (topic === "business") return region === "pk" ? "business" : "markets";
  if (topic === "world") return "world";
  if (topic === "sport") return "sports";
  return region === "pk" ? "pakistan" : "world";
}

export async function startDraftFromHeadline(formData: FormData) {
  const user = await requireRole("editor");
  const d = Input.parse(Object.fromEntries(formData));
  const db = await getDb();
  const catSlug = categoryFor(d.topic, d.region);
  const [category, author] = await Promise.all([
    db.query.categories.findFirst({ where: and(eq(schema.categories.kind, "news"), eq(schema.categories.slug, catSlug)), columns: { id: true } }),
    db.query.authors.findFirst({ where: eq(schema.authors.userId, user.id), columns: { id: true } }),
  ]);
  const slug = await uniqueSlug(slugify(d.title).slice(0, 80), async (s) => !!(await db.query.articles.findFirst({ where: and(eq(schema.articles.kind, "news"), eq(schema.articles.slug, s)), columns: { id: true } })));
  const body = `## What happened\n\n(Write it in your own words. Do not paste from the source.)\n\n## Why it matters\n\n- For readers in Pakistan:\n- Numbers, dates, names:\n\n## What happens next\n\n`;
  const [row] = await db
    .insert(schema.articles)
    .values({ kind: "news", status: "draft", slug, title: d.title, body, excerpt: "", categoryId: category?.id ?? null, authorId: author?.id ?? null, sources: [{ title: d.title, url: d.url, publisher: d.source }], faqs: [], relatedIds: [] })
    .returning({ id: schema.articles.id });
  redirect(`/admin/articles/${row.id}`);
}
