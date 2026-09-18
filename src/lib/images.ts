/** Widths of the smaller renditions written next to every stored image (see storage.ts). */
export const RENDITION_WIDTHS = [480, 960] as const;

/** Longest side of the stored master per variant. Shared by the browser (which now does the resizing) and the server. */
export type StoreVariant = "article" | "logo" | "cover" | "photo";
export const VARIANT_MAX: Record<StoreVariant, number> = { article: 1800, logo: 512, cover: 2000, photo: 1600 };
/** WebP quality: the master keeps more detail than the renditions cards use. */
export const MASTER_QUALITY = 82;
export const RENDITION_QUALITY = 78;

/** Upload variants the forms use, mapped onto the four stored kinds. */
export type UploadVariant = StoreVariant | "evidence" | "avatar" | "post" | "cv";
export function storeVariantFor(v: Exclude<UploadVariant, "cv">): StoreVariant {
  if (v === "evidence" || v === "post") return "photo";
  if (v === "avatar") return "logo";
  return v;
}

/** The width each rendition file must have for a master of `masterWidth`: never enlarged, always present. */
export function renditionWidth(w: (typeof RENDITION_WIDTHS)[number], masterWidth: number): number {
  return Math.min(w, masterWidth || w);
}

/**
 * srcset for an image we stored (…/uploads/YYYY/MM/<uuid>.webp): the 480 and 960 px renditions plus the
 * master. Anything else (a remote photo, an old file) gets no srcset and loads as is.
 */
export function srcSetFor(url: string, masterWidth?: number | null, opts: { /** Leave the master out: a card never needs more than 960 px, and a 3x phone would otherwise fetch it. */ maxWidth?: number } = {}): string | undefined {
  const m = url.match(/^(.*\/uploads\/\d{4}\/\d{2}\/[0-9a-f-]{36})\.webp$/i);
  if (!m) return undefined;
  const parts = RENDITION_WIDTHS.filter((w) => !masterWidth || w < masterWidth).map((w) => `${m[1]}-${w}.webp ${w}w`);
  if (!opts.maxWidth || (masterWidth ?? 1600) <= opts.maxWidth) parts.push(`${url} ${masterWidth ?? 1600}w`);
  return parts.join(", ");
}
