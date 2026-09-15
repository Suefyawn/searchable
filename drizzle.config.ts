import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "pglite://./.data/pglite";
const isPglite = url.startsWith("pglite://");

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(isPglite
    ? { driver: "pglite", dbCredentials: { url: url.replace("pglite://", "") } }
    : { dbCredentials: { url } }),
  strict: true,
  verbose: true,
});
