import { defineConfig, type Plugin } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "node:path";
import { responseStoreAdapter } from "@vinext/cloudflare/cache/response-store-adapter";

const lib = (file: string) => path.resolve(import.meta.dirname, "src/lib", file);

/**
 * Runtime-specific code lives in one module pair (src/lib/platform.ts and platform.workerd.ts); the Workers
 * build gets the workerd version. Done as a `pre` plugin because vinext resolves `@/` paths before
 * `resolve.alias` runs. The local-only database engine is stubbed out for the same reason: it is never opened
 * on Workers and would add 480 KB to the bundle.
 */
const workersOnly: Plugin = {
  name: "searchable:workers-only",
  enforce: "pre",
  resolveId(source) {
    if (/^(@\/lib\/platform|.*[\\/]src[\\/]lib[\\/]platform(\.ts)?)$/.test(source)) return lib("platform.workerd.ts");
    if (/^(@electric-sql\/pglite(\/.*)?|drizzle-orm\/pglite)$/.test(source)) return lib("stub-empty.ts");
    return null;
  },
};

export default defineConfig({
  plugins: [
    workersOnly,
    vinext({
      cache: responseStoreAdapter({ mode: "self-contained" }),
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
