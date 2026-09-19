import { adminPost } from "./_api";

/**
 * Seeds the running instance (BASE_URL, default http://localhost:3000) through the admin API, because only the
 * app holds the D1 binding. SEED_MODE=reference|sample (default sample). On an empty database pass
 * SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD so the first admin account can be created.
 */
async function main() {
  const mode = process.env.SEED_MODE === "reference" ? "reference" : "sample";
  const out = (await adminPost("/jobs", { job: "seed", mode, adminEmail: process.env.SEED_ADMIN_EMAIL, adminPassword: process.env.SEED_ADMIN_PASSWORD })) as { log: string[] };
  for (const line of out.log) console.log("  " + line);
  process.exit(0);
}
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
