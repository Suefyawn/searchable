"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { entitiesIn, importOpenImage, searchPhotos, type OpenImage } from "@/lib/open-images";
import { rateLimit } from "@/lib/rate-limit";

export async function searchOpenImagesAction(query: string) {
  const user = await requireRole("editor");
  const q = z.string().trim().min(2).max(120).parse(query);
  const rl = await rateLimit(`open-images:${user.id}`, 15, 60_000);
  if (!rl.ok) return { error: "Slow down, 15 searches a minute." as const, results: [] as OpenImage[] };
  // Names in the query ("Babar Azam", "PSX") get their Wikipedia photo first; then Openverse, then Commons.
  const results = await searchPhotos(q, { limit: 18, minWidth: 900, entities: entitiesIn(q) });
  return results.length ? { results } : { error: "Nothing openly licensed for that; try a more concrete scene or a name" as const, results: [] as OpenImage[] };
}

export async function importOpenImageAction(img: OpenImage, variant: "article" | "cover" | "photo" = "article") {
  await requireRole("editor");
  const parsed = z
    .object({ id: z.string(), title: z.string(), creator: z.string().nullable(), license: z.string(), licenseVersion: z.string().nullable(), licenseUrl: z.string().nullable(), source: z.string(), sourceUrl: z.string().url(), url: z.string().url(), thumbnail: z.string(), width: z.number().nullable(), height: z.number().nullable() })
    .parse(img);
  if (!/^https:\/\/(live\.staticflickr\.com|farm\d+\.staticflickr\.com|upload\.wikimedia\.org|[a-z0-9.-]+\.(?:org|com|gov|edu|net))\//i.test(parsed.url)) throw new Error("Unexpected image host");
  return importOpenImage(parsed, variant);
}
