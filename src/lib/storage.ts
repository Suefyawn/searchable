import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getDb, schema } from "@/db";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export type StoredImage = { id: string; url: string; width: number; height: number; bytes: number; mimeType: string };

type Variant = "article" | "logo" | "cover" | "photo";
const VARIANT_MAX: Record<Variant, number> = { article: 1800, logo: 512, cover: 2000, photo: 1600 };

/**
 * Normalises an uploaded image (resize to a sane maximum, convert to WebP, strip metadata),
 * stores it, and records it in the `media` table.
 *
 * STORAGE_PROVIDER=local (default) writes to public/uploads/YYYY/MM/. Production swaps this for
 * Supabase Storage by implementing `putObject` for that provider, the rest is unchanged.
 */
export async function storeImage(input: Buffer, opts: { variant: Variant; alt?: string; credit?: string; originalName?: string }): Promise<StoredImage> {
  const max = VARIANT_MAX[opts.variant];
  const pipeline = sharp(input, { failOn: "error" }).rotate().resize({ width: max, height: max, fit: "inside", withoutEnlargement: true });
  const out = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
  const id = crypto.randomUUID();
  const now = new Date();
  const key = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}.webp`;
  const url = await putObject(key, out.data, "image/webp");
  const db = await getDb();
  const [row] = await db
    .insert(schema.media)
    .values({ url, storageKey: key, mimeType: "image/webp", width: out.info.width, height: out.info.height, bytes: out.info.size, alt: opts.alt ?? opts.originalName?.replace(/\.[a-z0-9]+$/i, "") ?? null, credit: opts.credit ?? null })
    .returning({ id: schema.media.id });
  return { id: row.id, url, width: out.info.width, height: out.info.height, bytes: out.info.size, mimeType: "image/webp" };
}

async function putObject(key: string, data: Buffer, contentType: string): Promise<string> {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider === "supabase") {
    const base = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "media";
    if (!base || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for STORAGE_PROVIDER=supabase");
    const res = await fetch(`${base}/storage/v1/object/${bucket}/${key}`, {
      method: "POST",
      headers: { authorization: `Bearer ${serviceKey}`, "content-type": contentType, "x-upsert": "true", "cache-control": "public, max-age=31536000, immutable" },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`Supabase Storage upload failed: ${res.status} ${await res.text()}`);
    return `${base}/storage/v1/object/public/${bucket}/${key}`;
  }
  const abs = path.join(process.cwd(), "public", key);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, data);
  return `/${key}`;
}
