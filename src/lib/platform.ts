/**
 * The one file that differs per runtime. This is the Node version (Vercel, `next dev`, scripts).
 * `vite.config.ts` aliases `@/lib/platform` to `platform.workerd.ts` for the Cloudflare Workers build, so
 * nothing else in `src/` needs to know where it runs.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

/** Bucket, database and static-asset bindings, present only on Workers. */
export type R2Put = (key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string; cacheControl?: string } }) => Promise<unknown>;
export type Bindings = {
  DB?: D1Database;
  MEDIA?: { put: R2Put };
  ASSETS?: { fetch: (input: Request | string) => Promise<Response> };
  ANALYTICS?: { writeDataPoint: (point: { indexes?: string[]; blobs?: string[]; doubles?: number[] }) => void };
  IMAGES?: ImagesBinding;
};

/** The slice of Cloudflare's Images binding the storage layer calls (ADR-50). */
export type ImagesBinding = {
  info(stream: ReadableStream): Promise<{ format: string; fileSize?: number; width?: number; height?: number }>;
  input(stream: ReadableStream): {
    transform(options: { width?: number; height?: number; fit?: "scale-down" | "contain" | "cover" | "crop" | "pad" }): {
      output(options: { format: "image/webp" | "image/jpeg" | "image/png" | "image/avif"; quality?: number }): Promise<{ image(): ReadableStream; contentType(): string }>;
    };
  };
};

export function bindings(): Bindings {
  return {};
}

/**
 * Whether this runtime may spend real CPU on one request: decoding and resizing an image, rendering a social
 * card. True on Node. False on the Workers free plan (10 ms per request), where that work is done by the
 * browser or the automation before upload and the server only validates and stores.
 */
export const heavyComputeAllowed = true;

/** The WebAssembly image codecs (photon, libwebp), compiled once per process. */
const compile = async (specifier: string) => WebAssembly.compile(await readFile(createRequire(import.meta.url).resolve(specifier)));
export const photonModule = () => compile("@cf-wasm/photon/photon.wasm");
export const webpEncoderModule = () => compile("@jsquash/webp/codec/enc/webp_enc_simd.wasm");

/** A file under public/, read from disk here and from the static assets binding on Workers. */
export async function publicFile(relPath: string): Promise<ArrayBuffer> {
  const b = await readFile(path.join(process.cwd(), "public", relPath));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}
export const publicFont = (file: string) => publicFile(`fonts/${file}`);
