import type { NextConfig } from "next";

// PGlite (local dev database) is single-process. When building against it, prerender with one
// worker so parallel build workers don't all try to open the same data directory.
const usingPglite = (process.env.DATABASE_URL ?? "pglite://./.data/pglite").startsWith("pglite://");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  // Renditions are written at upload time (src/lib/storage.ts) and served as plain <img srcset>, so the
  // metered image optimiser is never used.
  images: { unoptimized: true },
  // The social-card renderer reads its serif font from disk; make sure the file ships with that function.
  outputFileTracingIncludes: { "/og": ["./src/app/og/*.ttf"] },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
    ...(usingPglite ? { cpus: 1, workerThreads: false } : {}),
  },
};

export default nextConfig;
