// Module shapes that only exist in one runtime. `wrangler types` can replace these once the Worker is deployed.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
declare module "*.wasm" {
  const wasm: WebAssembly.Module;
  export default wasm;
}
