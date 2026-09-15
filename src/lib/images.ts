/** Widths of the smaller renditions written next to every stored image (see storage.ts). */
export const RENDITION_WIDTHS = [480, 960] as const;

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
