import { adminPost } from "./_api";

/** Rebuilds the search index of the running instance (BASE_URL, default http://localhost:3000) through the admin API. */
async function main() {
  const out = (await adminPost("/jobs", { job: "reindex" })) as { counts: Record<string, number> };
  console.log(`✓ reindexed: ${JSON.stringify(out.counts)}`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
