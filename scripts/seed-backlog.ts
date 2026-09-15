import "dotenv/config";
import { BACKLOG } from "./seed-data/backlog";
import { upsertBacklog } from "../src/lib/backlog";

/** Load the researched backlog into the settings row: npm run seed:backlog (DATABASE_URL picks the target). */
async function main() {
  // No status here: a reseed refreshes volumes and briefs but never reopens what the task has finished.
  const r = await upsertBacklog(BACKLOG.map((b) => ({ ...b })));
  console.log(`✓ backlog: ${r.added} added, ${r.updated} updated`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
