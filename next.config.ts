import type { NextConfig } from "next";

// PGlite (local dev database) is single-process. When building against it, prerender with one
// worker so parallel build workers don't all try to open the same data directory.
const usingPglite = (process.env.DATABASE_URL ?? "pglite://./.data/pglite").startsWith("pglite://");

const nextConfig: NextConfig = {
  // PGlite (local database) and the WebAssembly image codecs load their binaries relative to their own files.
  serverExternalPackages: ["@electric-sql/pglite", "@cf-wasm/photon", "@jsquash/webp"],
  // Renditions are written at upload time (src/lib/storage.ts) and served as plain <img srcset>, so the
  // metered image optimiser is never used.
  images: { unoptimized: true },
  // Files read at request time that the tracer cannot see: the social card fonts, and the WebAssembly image
  // codecs that src/lib/platform.ts resolves by name (uploads, imports and photo backfill run from many routes).
  outputFileTracingIncludes: {
    "/og": ["./public/fonts/*.ttf"],
    "/**": ["./node_modules/@cf-wasm/photon/dist/lib/photon_rs_bg.wasm", "./node_modules/@jsquash/webp/codec/enc/*.wasm"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
    ...(usingPglite ? { cpus: 1, workerThreads: false } : {}),
  },
};

/**
 * Security headers on every response. Framing is refused everywhere except calculator pages, which other sites
 * embed through ?embed=1 (src/components/tools/embed.tsx). A full script CSP is not workable with AdSense; the
 * page is protected by escaping instead (src/lib/markdown.ts). Vercel adds HSTS itself.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
];

/** RFC 8288 / RFC 9727 discovery links on the home page: where the API catalog, OpenAPI and docs live. */
nextConfig.headers = async () => [
  { source: "/:path*", headers: SECURITY_HEADERS },
  { source: "/tools/:category/:slug", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *; object-src 'none'; base-uri 'self'" }] },
  {
    source: "/",
    headers: [
      { key: "Link", value: '</.well-known/api-catalog>; rel="api-catalog", </openapi.json>; rel="service-desc"; type="application/openapi+json", </llms.txt>; rel="service-doc"; type="text/plain", </llms.txt>; rel="describedby"; type="text/plain", </.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/json", </.well-known/agent-card.json>; rel="agent-card"; type="application/json"' },
    ],
  },
];

/** Same-origin path for the image CDN, used only as a fallback when a visitor cannot reach the CDN host. */
const imageHost = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
nextConfig.rewrites = async () => [
  // vinext's router skips dot-directories, so the agent surface lives in src/app/well-known and answers at /.well-known/ (ADR-38).
  { source: "/.well-known/:path*", destination: "/well-known/:path*" },
  ...(imageHost ? [{ source: "/media/:path*", destination: `${imageHost}/:path*` }] : []),
];

export default nextConfig;
