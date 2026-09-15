import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { storeImage } from "./storage";

const MAX_BYTES = 25 * 1024 * 1024;
const UA = "Searchable.pk image importer (+https://searchable.pk)";

/**
 * Fetch an openly licensed image by URL and store it like an upload (renditions, media row, credit).
 * Used by the admin API when the automation already knows the photo it wants (Wikimedia Commons, a press
 * kit, a government release). Licence and source are recorded on the media row for the credits page.
 */
export async function importImageFromUrl(url: string, opts: { variant?: "article" | "cover" | "photo" | "logo"; alt?: string; credit?: string; sourceUrl?: string; license?: string }) {
  if (!/^https:\/\//.test(url)) throw new Error("Image URL must be https");
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (!/^image\/(jpeg|png|webp|gif|avif)/.test(type)) throw new Error(`Not an image (${type || "unknown type"})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("Image larger than 25 MB");
  const stored = await storeImage(buf, { variant: opts.variant ?? "article", alt: opts.alt, credit: opts.credit });
  if (opts.license || opts.sourceUrl) {
    const db = await getDb();
    await db.update(schema.media).set({ license: opts.license ?? null, sourceUrl: opts.sourceUrl ?? url }).where(eq(schema.media.id, stored.id));
  }
  return stored;
}
