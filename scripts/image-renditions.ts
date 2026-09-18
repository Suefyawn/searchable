import "dotenv/config";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decodeImage, toWebp } from "../src/lib/image-resize";
import { RENDITION_WIDTHS } from "../src/lib/images";

/**
 * Backfill 480/960 px renditions for images uploaded before storage.ts wrote them.
 * Local storage only (public/uploads); on R2 re-upload through the admin media page instead.
 */
async function main() {
  const root = path.join(process.cwd(), "public", "uploads");
  if (!existsSync(root)) return console.log("no uploads");
  let made = 0;
  for (const y of readdirSync(root)) {
    for (const m of readdirSync(path.join(root, y))) {
      const dir = path.join(root, y, m);
      for (const f of readdirSync(dir)) {
        if (!/^[0-9a-f-]{36}\.webp$/i.test(f)) continue;
        const stem = path.join(dir, f.replace(/\.webp$/i, ""));
        const master = await decodeImage(new Uint8Array(readFileSync(path.join(dir, f))));
        try {
          for (const w of RENDITION_WIDTHS) {
            const out = `${stem}-${w}.webp`;
            if (w >= master.width || existsSync(out)) continue;
            writeFileSync(out, (await toWebp(master, { width: w }, 78)).data);
            made++;
          }
        } finally {
          master.img.free();
        }
      }
    }
  }
  console.log(`renditions written: ${made}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
