import "dotenv/config";

/**
 * PGlite is single-process. Running a db script while `next dev` holds the database open
 * would corrupt or desync it, so every script calls this first and aborts if the dev server responds.
 */
export async function assertDevServerStopped() {
  const url = process.env.DATABASE_URL ?? "pglite://./.data/pglite";
  if (!url.startsWith("pglite://")) return;
  const port = process.env.PORT ?? "3000";
  try {
    const res = await fetch(`http://localhost:${port}/`, { method: "HEAD", signal: AbortSignal.timeout(1500) });
    if (res.ok || res.status < 500) {
      console.error(`✗ The dev server is running on port ${port}. Stop it before running database scripts (PGlite is single-process).`);
      process.exit(1);
    }
  } catch {
    /* nothing listening, safe to proceed */
  }
}
