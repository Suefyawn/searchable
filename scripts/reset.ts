import "dotenv/config";
import { rmSync } from "node:fs";
import { assertDevServerStopped } from "./_guard";

async function main() {
  await assertDevServerStopped();
  const url = process.env.DATABASE_URL ?? "pglite://./.data/pglite";
  if (!url.startsWith("pglite://")) {
    console.error("db:reset only wipes a local PGlite database. Refusing to touch a remote Postgres.");
    process.exit(1);
  }
  rmSync(url.replace("pglite://", ""), { recursive: true, force: true });
  console.log("✓ local database wiped");
}
main();
