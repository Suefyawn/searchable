import type { NextConfig } from "next";

// PGlite (local dev database) is single-process. When building against it, prerender with one
// worker so parallel build workers don't all try to open the same data directory.
const usingPglite = (process.env.DATABASE_URL ?? "pglite://./.data/pglite").startsWith("pglite://");

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
    ...(usingPglite ? { cpus: 1, workerThreads: false } : {}),
  },
};

export default nextConfig;
