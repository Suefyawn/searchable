import "dotenv/config";
import { readdirSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
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
        const master = sharp(path.join(dir, f));
        const { width = 0 } = await master.metadata();
        for (const w of RENDITION_WIDTHS) {
          const out = `${stem}-${w}.webp`;
          if (w >= width || existsSync(out)) continue;
          await master.clone().resize({ width: w }).webp({ quality: 78, effort: 4 }).toFile(out);
          made++;
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
