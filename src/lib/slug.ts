import slugifyLib from "slugify";

export function slugify(input: string): string {
  return slugifyLib(input, { lower: true, strict: true, trim: true }).slice(0, 80);
}

/** Append -2, -3… until `exists` returns false. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let candidate = base;
  let i = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${i++}`;
  }
  return candidate;
}
