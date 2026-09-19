/**
 * Trigram similarity in plain JavaScript, the same measure pg_trgm's similarity() gave the Postgres search:
 * the size of the shared trigram set over the size of the union. Used to rank the candidates an FTS5 trigram
 * query returns and to pick a "did you mean" from logged searches. Pure, so it has a unit test.
 */
export function trigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (const word of s.toLowerCase().split(/[^a-z0-9؀-ۿ]+/)) {
    if (!word) continue;
    const padded = `  ${word} `;
    for (let i = 0; i + 3 <= padded.length; i++) out.add(padded.slice(i, i + 3));
  }
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / (ta.size + tb.size - shared);
}

/**
 * Word-level similarity for typo tolerance: for each query word the best trigram match among the text's words,
 * averaged. Whole-string similarity punishes long titles ("petrl price" scores 0.29 against "Petrol price in
 * Pakistan today"); word by word it is 0.72, because "price" is exact and "petrl" is close to "petrol".
 */
export function wordSimilarity(text: string, q: string): number {
  const words = text.toLowerCase().split(/[^a-z0-9؀-ۿ]+/).filter(Boolean);
  const qs = q.toLowerCase().split(/[^a-z0-9؀-ۿ]+/).filter(Boolean);
  if (!words.length || !qs.length) return 0;
  let sum = 0;
  for (const w of qs) sum += Math.max(0, ...words.map((x) => trigramSimilarity(x, w)));
  return sum / qs.length;
}

/** The FTS5 MATCH string that finds anything sharing a trigram with `q`, for a trigram-tokenised table. */
export function trigramMatch(q: string): string | null {
  const parts = [...trigrams(q)].map((t) => t.trim()).filter((t) => t.length === 3 && /^[a-z0-9؀-ۿ]+$/.test(t));
  return parts.length ? parts.map((t) => `"${t}"`).join(" OR ") : null;
}

/** True when two space-separated strings share at least one word (Postgres `string_to_array(a) && string_to_array(b)`). */
export function shareWord(a: string, b: string): boolean {
  const words = new Set(a.split(" ").filter(Boolean));
  return b.split(" ").some((w) => w && words.has(w));
}
