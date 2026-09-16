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

/** RFC 8288 / RFC 9727 discovery links on the home page: where the API catalog, OpenAPI and docs live. */
nextConfig.headers = async () => [
  {
    source: "/",
    headers: [
      { key: "Link", value: '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc"; type="application/openapi+json", </llms.txt>; rel="service-doc"; type="text/plain", </llms.txt>; rel="describedby"; type="text/plain", </.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/json", </.well-known/agent-card.json>; rel="agent-card"; type="application/json"' },
    ],
  },
];

/** Same-origin path for the image CDN, used only as a fallback when a visitor cannot reach the CDN host. */
const imageHost = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
if (imageHost) {
  nextConfig.rewrites = async () => [{ source: "/media/:path*", destination: `${imageHost}/:path*` }];
}

export default nextConfig;
