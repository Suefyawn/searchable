import { defineConfig } from "drizzle-kit";

/** Schema lives in TypeScript; `npm run db:generate` writes SQL migrations for D1 into migrations/ (ADR-45). */
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1-http",
  strict: true,
  verbose: true,
});
