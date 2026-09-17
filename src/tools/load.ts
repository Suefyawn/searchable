import type { ToolDefinition } from "./types";

/**
 * Loads one calculator's module on demand. The browser bundle for a tool page carries that tool only; the
 * registry (every calculator plus every rate table) stays on the server. Relies on rule 4 in CLAUDE.md:
 * the file is src/tools/calculators/<slug>.ts and exports the definition.
 */
export async function loadTool(slug: string): Promise<ToolDefinition | undefined> {
  if (!/^[a-z0-9-]+$/.test(slug)) return undefined;
  const mod = (await import(`./calculators/${slug}`)) as Record<string, unknown>;
  return Object.values(mod).find((v): v is ToolDefinition => !!v && typeof v === "object" && "compute" in v && "fields" in v);
}
