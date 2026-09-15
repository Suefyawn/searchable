import "dotenv/config";
import { assertDevServerStopped } from "./_guard";
import { getDb, isPglite } from "../src/db";

async function main() {
  await assertDevServerStopped();
  const db = await getDb();
  if (isPglite) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder: "./drizzle" });
  } else {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db as never, { migrationsFolder: "./drizzle" });
  }
  console.log(`✓ migrations applied (${isPglite ? "PGlite" : "Postgres"})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
