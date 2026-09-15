import { createHash, createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { getDb, schema } from "@/db";
import { RENDITION_WIDTHS } from "./images";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_TYPES = new Set(["application/pdf"]);

export type StoredImage = { id: string; url: string; width: number; height: number; bytes: number; mimeType: string };

type Variant = "article" | "logo" | "cover" | "photo";
const VARIANT_MAX: Record<Variant, number> = { article: 1800, logo: 512, cover: 2000, photo: 1600 };

/**
 * Normalises an uploaded image (resize to a sane maximum, convert to WebP, strip metadata), writes it plus
 * 480 and 960 px renditions, and records it in the `media` table.
 *
 * Renditions are made here, once, with sharp, so the site never needs an image-optimisation service
 * (Vercel's is metered on the free plan). Pages use plain <img srcset> via `srcSetFor()`.
 *
 * STORAGE_PROVIDER=local (default) writes to public/uploads/YYYY/MM/. `r2` puts objects in a Cloudflare R2
 * bucket (free egress, served from R2_PUBLIC_URL). `supabase` uses Supabase Storage (metered egress; avoid).
 */
export async function storeImage(input: Buffer, opts: { variant: Variant; alt?: string; credit?: string; originalName?: string }): Promise<StoredImage> {
  const max = VARIANT_MAX[opts.variant];
  const base = sharp(input, { failOn: "error" }).rotate();
  const out = await base.clone().resize({ width: max, height: max, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
  const id = crypto.randomUUID();
  const now = new Date();
  const dir = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `${dir}/${id}.webp`;
  const url = await putObject(key, out.data, "image/webp");
  await writeRenditions(base, out.info.width, `${dir}/${id}`);
  const db = await getDb();
  const [row] = await db
    .insert(schema.media)
    .values({ url, storageKey: key, mimeType: "image/webp", width: out.info.width, height: out.info.height, bytes: out.info.size, alt: opts.alt ?? opts.originalName?.replace(/\.[a-z0-9]+$/i, "") ?? null, credit: opts.credit ?? null })
    .returning({ id: schema.media.id });
  return { id: row.id, url, width: out.info.width, height: out.info.height, bytes: out.info.size, mimeType: "image/webp" };
}

/** Stores a document as is (CVs are PDFs). Same providers as images; served from an unguessable key. */
export async function storeDocument(input: Buffer, opts: { mimeType: string; originalName?: string; folder?: string }): Promise<{ id: string; url: string; bytes: number }> {
  if (!DOCUMENT_TYPES.has(opts.mimeType)) throw new Error("Only PDF documents are accepted");
  const id = crypto.randomUUID();
  const key = `uploads/${opts.folder ?? "documents"}/${id}.pdf`;
  const url = await putObject(key, input, opts.mimeType);
  const db = await getDb();
  await db.insert(schema.media).values({ url, storageKey: key, mimeType: opts.mimeType, width: 0, height: 0, bytes: input.length, alt: opts.originalName?.replace(/\.[a-z0-9]+$/i, "") ?? null, credit: null });
  return { id, url, bytes: input.length };
}

/** Writes `<stem>-480.webp` and `<stem>-960.webp` for any rendition narrower than the master. */
export async function writeRenditions(image: sharp.Sharp, masterWidth: number, stem: string) {
  for (const w of RENDITION_WIDTHS) {
    if (w >= masterWidth) continue;
    const r = await image.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toBuffer();
    await putObject(`${stem}-${w}.webp`, r, "image/webp");
  }
}

export async function putObject(key: string, data: Buffer, contentType: string): Promise<string> {
  const provider = process.env.STORAGE_PROVIDER ?? "local";
  if (provider === "r2") return putR2(key, data, contentType);
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

/**
 * Cloudflare R2 via the S3 API, signed with AWS SigV4 in ~30 lines so we carry no SDK.
 * Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL
 * (the bucket's custom domain, e.g. https://img.searchable.pk, which Cloudflare caches at the edge).
 */
async function putR2(key: string, data: Buffer, contentType: string): Promise<string> {
  const { R2_ACCOUNT_ID: account, R2_ACCESS_KEY_ID: accessKey, R2_SECRET_ACCESS_KEY: secret, R2_BUCKET: bucket, R2_PUBLIC_URL: publicUrl } = process.env;
  if (!account || !accessKey || !secret || !bucket || !publicUrl) throw new Error("R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL are required for STORAGE_PROVIDER=r2");
  const host = `${account}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256(data);
  const headers: Record<string, string> = {
    "cache-control": "public, max-age=31536000, immutable",
    "content-type": contentType,
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k].trim()}\n`)
    .join("");
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${date}/auto/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const kSigning = ["auto", "s3", "aws4_request"].reduce((k, part) => hmac(k, part), hmac(`AWS4${secret}`, date));
  const signature = hmac(kSigning, stringToSign).toString("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const res = await fetch(`https://${host}${canonicalUri}`, { method: "PUT", headers: { ...headers, authorization }, body: new Uint8Array(data) });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status} ${await res.text()}`);
  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

function sha256(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}
function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}
