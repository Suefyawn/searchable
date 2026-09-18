import { createHash, createHmac } from "node:crypto";
import { getDb, schema } from "@/db";
import { decodeImage, toWebp, type Decoded } from "@/lib/image-resize";
import { bindings, heavyComputeAllowed } from "@/lib/platform";
import { webpDimensions } from "@/lib/webp";
import { MASTER_QUALITY, RENDITION_QUALITY, RENDITION_WIDTHS, VARIANT_MAX, renditionWidth, type StoreVariant } from "./images";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_TYPES = new Set(["application/pdf"]);

export type StoredImage = { id: string; url: string; width: number; height: number; bytes: number; mimeType: string };

type Variant = StoreVariant;

/** Thrown when a caller asks this server to resize but the runtime may not spend the CPU (Workers free plan). */
export class NoServerResize extends Error {
  constructor() {
    super("This server does not resize images. Send the master and the 960 and 480 px WebP renditions, prepared by the browser or the automation.");
  }
}

/** The three files a client prepares: master plus one file per rendition width, all WebP. */
export type PreparedImage = { master: Uint8Array; renditions: Record<(typeof RENDITION_WIDTHS)[number], Uint8Array> };

/**
 * Stores files the client already resized and encoded (src/components/upload/upload-client.ts in the browser,
 * the automation for imports). The server reads the WebP headers (no decoding), checks every size against the
 * variant and the rendition rule, writes the three objects and the media row. Zero image CPU.
 */
export async function storePreparedImage(files: PreparedImage, opts: { variant: Variant; alt?: string; credit?: string; originalName?: string }): Promise<StoredImage> {
  const master = webpDimensions(files.master);
  if (!master) throw new Error("The master file is not a WebP image");
  const max = VARIANT_MAX[opts.variant];
  if (master.width > max || master.height > max) throw new Error(`The master must fit inside ${max} px for a ${opts.variant} image`);
  if (files.master.byteLength > MAX_UPLOAD_BYTES) throw new Error("The master is too large");
  for (const w of RENDITION_WIDTHS) {
    const dims = webpDimensions(files.renditions[w]);
    if (!dims) throw new Error(`The ${w} px rendition is not a WebP image`);
    if (dims.width !== renditionWidth(w, master.width)) throw new Error(`The ${w} px rendition must be ${renditionWidth(w, master.width)} px wide`);
    if (files.renditions[w].byteLength > files.master.byteLength * 2) throw new Error(`The ${w} px rendition is larger than expected`);
  }
  const id = crypto.randomUUID();
  const now = new Date();
  const dir = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `${dir}/${id}.webp`;
  const url = await putObject(key, files.master, "image/webp");
  for (const w of RENDITION_WIDTHS) await putObject(`${dir}/${id}-${w}.webp`, files.renditions[w], "image/webp");
  const db = await getDb();
  const [row] = await db
    .insert(schema.media)
    .values({ url, storageKey: key, mimeType: "image/webp", width: master.width, height: master.height, bytes: files.master.byteLength, alt: opts.alt ?? opts.originalName?.replace(/\.[a-z0-9]+$/i, "") ?? null, credit: opts.credit ?? null })
    .returning({ id: schema.media.id });
  return { id: row.id, url, width: master.width, height: master.height, bytes: files.master.byteLength, mimeType: "image/webp" };
}

/**
 * Normalises an uploaded image (resize to a sane maximum, convert to WebP, strip metadata), writes it plus
 * 480 and 960 px renditions, and records it in the `media` table.
 *
 * Renditions are made here, once, in WebAssembly (src/lib/image-resize.ts), so the site never needs an
 * image-optimisation service (metered everywhere). Pages use plain <img srcset> via `srcSetFor()`.
 *
 * STORAGE_PROVIDER=local (default) writes to public/uploads/YYYY/MM/. `r2` puts objects in a Cloudflare R2
 * bucket (free egress, served from R2_PUBLIC_URL) through the MEDIA binding on Workers or a signed PUT
 * elsewhere. `supabase` uses Supabase Storage (metered egress; avoid).
 */
export async function storeImage(input: Uint8Array, opts: { variant: Variant; alt?: string; credit?: string; originalName?: string }): Promise<StoredImage> {
  if (!heavyComputeAllowed) throw new NoServerResize();
  const max = VARIANT_MAX[opts.variant];
  const decoded = await decodeImage(input);
  try {
    const out = await toWebp(decoded, { width: max, height: max }, MASTER_QUALITY);
    const id = crypto.randomUUID();
    const now = new Date();
    const dir = `uploads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const key = `${dir}/${id}.webp`;
    const url = await putObject(key, out.data, "image/webp");
    await writeRenditions(decoded, out.width, `${dir}/${id}`);
    const db = await getDb();
    const [row] = await db
      .insert(schema.media)
      .values({ url, storageKey: key, mimeType: "image/webp", width: out.width, height: out.height, bytes: out.data.byteLength, alt: opts.alt ?? opts.originalName?.replace(/\.[a-z0-9]+$/i, "") ?? null, credit: opts.credit ?? null })
      .returning({ id: schema.media.id });
    return { id: row.id, url, width: out.width, height: out.height, bytes: out.data.byteLength, mimeType: "image/webp" };
  } finally {
    decoded.img.free();
  }
}

/** Stores a document as is (CVs are PDFs). Same providers as images; served from an unguessable key. */
export async function storeDocument(input: Uint8Array, opts: { mimeType: string; originalName?: string; folder?: string }): Promise<{ id: string; url: string; bytes: number }> {
  if (!DOCUMENT_TYPES.has(opts.mimeType) || new TextDecoder("latin1").decode(input.subarray(0, 5)) !== "%PDF-") throw new Error("Only PDF documents are accepted");
  const id = crypto.randomUUID();
  const key = `uploads/${opts.folder ?? "documents"}/${id}.pdf`;
  const url = await putObject(key, input, opts.mimeType);
  const db = await getDb();
  await db.insert(schema.media).values({ url, storageKey: key, mimeType: opts.mimeType, width: 0, height: 0, bytes: input.length, alt: opts.originalName?.replace(/\.[a-z0-9]+$/i, "") ?? null, credit: null });
  return { id, url, bytes: input.length };
}

/**
 * Writes `<stem>-480.webp` and `<stem>-960.webp`. Every rendition name always exists: a master narrower than
 * the rendition is written as is under that name (never enlarged), because pages build the srcset from the
 * URL alone and a missing rendition is a broken image, not a fallback.
 */
export async function writeRenditions(image: Decoded, masterWidth: number, stem: string) {
  for (const w of RENDITION_WIDTHS) {
    const r = await toWebp(image, { width: renditionWidth(w, masterWidth) }, RENDITION_QUALITY);
    await putObject(`${stem}-${w}.webp`, r.data, "image/webp");
  }
}

/**
 * Backfill for files stored before every rendition name existed: for each stored image narrower than the
 * widest rendition, fetch the master and write the names that are missing. Returns how many were written.
 */
export async function backfillRenditions(limit = 40): Promise<{ checked: number; written: number; failed: string[] }> {
  const db = await getDb();
  const rows = await db.query.media.findMany({ where: (m, { and, lt, like, gt }) => and(lt(m.width, Math.max(...RENDITION_WIDTHS)), gt(m.width, 0), like(m.storageKey, "uploads/%.webp")), limit });
  if (!rows.length) return { checked: 0, written: 0, failed: [] };
  let written = 0;
  const failed: string[] = [];
  for (const m of rows) {
    const stem = (m.storageKey ?? "").replace(/[.]webp$/, "");
    if (!stem) continue;
    try {
      const missing: number[] = [];
      for (const w of RENDITION_WIDTHS) {
        if (w < (m.width ?? 0)) continue;
        const head = await fetch(m.url.replace(/[.]webp$/, `-${w}.webp`), { method: "HEAD", cache: "no-store" });
        if (!head.ok) missing.push(w);
      }
      if (!missing.length) continue;
      const res = await fetch(m.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      for (const w of missing) {
        await putObject(`${stem}-${w}.webp`, buf, "image/webp");
        written += 1;
      }
    } catch (e) {
      failed.push(`${m.storageKey}: ${(e as Error).message}`);
    }
  }
  return { checked: rows.length, written, failed };
}

export async function putObject(key: string, data: Uint8Array, contentType: string): Promise<string> {
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
  // Local disk, development only; loaded on demand so the Workers bundle never carries a filesystem write.
  const [{ mkdirSync, writeFileSync }, path] = await Promise.all([import("node:fs"), import("node:path")]);
  const abs = path.join(process.cwd(), "public", key);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, data);
  return `/${key}`;
}

/**
 * Cloudflare R2. On Workers the MEDIA bucket binding writes directly (no keys at all). Elsewhere the S3 API
 * is signed with AWS SigV4 in ~30 lines so we carry no SDK; that path needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY and R2_BUCKET. Both need R2_PUBLIC_URL (the bucket's custom domain, e.g.
 * https://img.searchable.pk, which Cloudflare caches at the edge).
 */
async function putR2(key: string, data: Uint8Array, contentType: string): Promise<string> {
  const media = bindings().MEDIA;
  const publicHost = process.env.R2_PUBLIC_URL;
  if (media && publicHost) {
    await media.put(key, data, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" } });
    return `${publicHost.replace(/\/$/, "")}/${key}`;
  }
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

function sha256(input: Uint8Array | string): string {
  return createHash("sha256").update(input).digest("hex");
}
function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}
