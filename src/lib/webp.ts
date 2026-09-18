/**
 * Reads the pixel size out of a WebP header without decoding it (a few bytes, no CPU), so a server that must
 * not resize can still check what the browser or the automation sent. Returns null when the bytes are not a
 * WebP file. Handles the three container flavours: lossy (VP8), lossless (VP8L) and extended (VP8X).
 */
export function webpDimensions(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 30 || ascii(b, 0, 4) !== "RIFF" || ascii(b, 8, 12) !== "WEBP") return null;
  const chunk = ascii(b, 12, 16);
  const p = 20; // first chunk payload
  if (chunk === "VP8 ") {
    // 3-byte frame tag, then the start code 9d 01 2a, then 14-bit width and height (the top 2 bits are scale).
    if (b[p + 3] !== 0x9d || b[p + 4] !== 0x01 || b[p + 5] !== 0x2a) return null;
    return { width: (b[p + 6] | (b[p + 7] << 8)) & 0x3fff, height: (b[p + 8] | (b[p + 9] << 8)) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if (b[p] !== 0x2f) return null;
    const b0 = b[p + 1], b1 = b[p + 2], b2 = b[p + 3], b3 = b[p + 4];
    return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
  }
  if (chunk === "VP8X") {
    // 1 byte flags, 3 reserved, then 24-bit canvas width minus one and height minus one.
    return { width: 1 + (b[p + 4] | (b[p + 5] << 8) | (b[p + 6] << 16)), height: 1 + (b[p + 7] | (b[p + 8] << 8) | (b[p + 9] << 16)) };
  }
  return null;
}

function ascii(b: Uint8Array, from: number, to: number): string {
  let s = "";
  for (let i = from; i < to; i++) s += String.fromCharCode(b[i]);
  return s;
}
