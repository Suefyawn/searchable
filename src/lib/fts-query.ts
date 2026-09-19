/**
 * Turns what a person typed (after synonym expansion) into an FTS5 MATCH string, doing what Postgres'
 * websearch_to_tsquery plus the prefix vector did before (ADR-45):
 *   petrol price          -> "petrol"* AND "price"*
 *   "full tank" petrol    -> "full tank" AND "petrol"*
 *   petrol -diesel        -> "petrol"* NOT "diesel"
 *   (bijli OR electricity) bill -> ("bijli"* OR "electricity"*) AND "bill"*
 * Every plain word gets a prefix star so a partial word still matches, and a trailing plural s is dropped from
 * longer words as a cheap stemmer (the index is not stemmed; see docs/schema-notes.md). Returns null when nothing
 * searchable is left.
 */
export function toFtsQuery(input: string): string | null {
  const groups: string[] = [];
  const negatives: string[] = [];
  const re = /"([^"]+)"|\(([^)]+)\)|(-?)([^\s()"]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    if (m[1] !== undefined) {
      const phrase = clean(m[1]);
      if (phrase) groups.push(`"${phrase}"`);
    } else if (m[2] !== undefined) {
      const alts = m[2]
        .split(/\s+OR\s+/i)
        .map((w) => term(w))
        .filter(Boolean);
      if (alts.length) groups.push(alts.length > 1 ? `(${alts.join(" OR ")})` : alts[0]!);
    } else {
      const word = m[4]!;
      if (/^or$/i.test(word)) continue;
      const t = term(word, m[3] === "-");
      if (!t) continue;
      if (m[3] === "-") negatives.push(t);
      else groups.push(t);
    }
  }
  if (!groups.length) return null;
  let out = groups.join(" AND ");
  if (negatives.length) out = `(${out}) NOT ${negatives.join(" NOT ")}`;
  return out;
}

function clean(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** One word as a quoted FTS5 token; prefix-matched unless it is a negation. */
function term(word: string, negated = false): string {
  let w = clean(word).replace(/\s.*$/, "");
  if (!w || w.length < 2) return "";
  if (!negated && w.length > 4 && /s$/.test(w) && !/ss$/.test(w)) w = w.slice(0, -1);
  return negated ? `"${w}"` : `"${w}"*`;
}
