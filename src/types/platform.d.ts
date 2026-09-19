// Module shapes that only exist in one runtime. `wrangler types` can replace these once the Worker is deployed.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
declare module "*.wasm" {
  const wasm: WebAssembly.Module;
  export default wasm;
}

/*
 * The slice of Cloudflare's D1 binding that drizzle-orm/d1 calls. Declared here instead of pulling in
 * @cloudflare/workers-types, whose globals (Request, fetch, ...) collide with the DOM types a Next.js app compiles
 * against.
 */
interface D1Meta {
  duration: number;
  changes: number;
  last_row_id: number;
  rows_read: number;
  rows_written: number;
  size_after?: number;
}
interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: D1Meta;
  error?: string;
}
interface D1ExecResult {
  count: number;
  duration: number;
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
  dump(): Promise<ArrayBuffer>;
}
