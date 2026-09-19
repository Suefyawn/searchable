/** Shared by the scripts that drive a running instance through the admin API (docs/ADMIN-API.md). */
import { readFileSync } from "node:fs";

export function adminKey(): string {
  if (process.env.ADMIN_API_KEY) return process.env.ADMIN_API_KEY;
  for (const file of [".dev.vars", ".env.local"]) {
    try {
      const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith("ADMIN_API_KEY="));
      if (line) return line.slice("ADMIN_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
    } catch {
      /* next file */
    }
  }
  throw new Error("ADMIN_API_KEY not set (env, .dev.vars or .env.local)");
}

export async function adminPost(path: string, body: unknown): Promise<unknown> {
  const base = process.env.BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/admin${path}`, { method: "POST", headers: { authorization: `Bearer ${adminKey()}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}
