import { initPhoton, PhotonImage, SamplingFilter, resize } from "@cf-wasm/photon/others";
import encode, { init as initWebp } from "@jsquash/webp/encode.js";
import { photonModule, webpEncoderModule } from "@/lib/platform";

/**
 * Image scaling without a native binary (ADR-42): photon (Rust, WebAssembly) decodes and resizes, libwebp
 * (WebAssembly, from jSquash) encodes, because photon's own WebP output is lossless and six times the size.
 * Same widths and quality as the sharp pipeline it replaces, so URLs and file sizes are unchanged.
 */
export type Decoded = { img: PhotonImage; width: number; height: number };

let photon: Promise<unknown> | undefined;
let encoder: Promise<unknown> | undefined;

/** Initialise once per process; a failed attempt is forgotten so the next call can retry. */
function once(slot: "photon" | "encoder", start: () => Promise<unknown>): Promise<unknown> {
  const current = slot === "photon" ? photon : encoder;
  if (current) return current;
  const p = start().catch((e) => {
    if (slot === "photon") photon = undefined;
    else encoder = undefined;
    throw e;
  });
  if (slot === "photon") photon = p;
  else encoder = p;
  return p;
}

export async function decodeImage(bytes: Uint8Array): Promise<Decoded> {
  await once("photon", () => photonModule().then((m) => initPhoton({ module_or_path: m })));
  const img = PhotonImage.new_from_byteslice(bytes);
  return { img, width: img.get_width(), height: img.get_height() };
}

/**
 * Scales so the image fits inside `max` (both sides for the master, width only for renditions) without ever
 * enlarging, and encodes WebP at `quality`. The source stays valid; free it when done.
 */
// ponytail: no EXIF auto-orient (sharp's .rotate()); add an EXIF orientation read + photon rotate if sideways uploads appear.
export async function toWebp(src: Decoded, max: { width: number; height?: number }, quality: number): Promise<{ data: Uint8Array; width: number; height: number }> {
  const scale = Math.min(1, max.width / src.width, max.height ? max.height / src.height : 1);
  const width = Math.max(1, Math.round(src.width * scale));
  const height = Math.max(1, Math.round(src.height * scale));
  const scaled = scale < 1 ? resize(src.img, width, height, SamplingFilter.Lanczos3) : src.img;
  try {
    await once("encoder", () => webpEncoderModule().then((m) => initWebp(m)));
    const rgba = scaled.get_raw_pixels();
    const out = await encode({ data: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), width, height, colorSpace: "srgb" } as ImageData, { quality, method: 4 });
    return { data: new Uint8Array(out), width, height };
  } finally {
    if (scaled !== src.img) scaled.free();
  }
}
