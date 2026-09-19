/**
 * Turns what a person typed (after synonym expansion) into an FTS5 MATCH string, doing what Postgres'
 * websearch_to_tsquery plus the prefix vector did before (ADR-45):
 *   petrol price          -> "petrol"* AND "price"*
 *   "full tank" petrol    -> "full tank" AND "petrol"*
 *   petrol -diesel        -> "petrol"* NOT "diesel"
 *   (bijli OR electricity) bill -> ("bijli"* OR "electricity"*) AND "bill"*
 * Every plain word gets a prefix star so a partial word still matches, and a trailing plural s is dropped from
 * longer words as a cheap stemmer (the index is not stemmed; see docs/schema-notes.md). Function words ("how to",
 * "ka", "the") are dropped when anything else remains: prefix-matched they hit "today", "tola" and "there" and
 * starve the AND. `any: true` joins the groups with OR instead of AND, the fallback when the AND finds nothing.
 * Returns null when nothing searchable is left.
 */
export function toFtsQuery(input: string, opts: { any?: boolean } = {}): string | null {
  const groups: string[] = [];
  const negatives: string[] = [];
  const re = /"([^"]+)"|\(([^)]+)\)|(-?)([^\s()"]+)/g;
  let m: RegExpExecArray | null;
  const words = [...input.matchAll(/(?:^|\s)(?!-)([^\s()"]+)/g)].map((x) => clean(x[1]!));
  const dropStops = words.some((w) => w && !STOP.has(w));
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
      if (dropStops && m[3] !== "-" && STOP.has(clean(word))) continue;
      const t = term(word, m[3] === "-");
      if (!t) continue;
      if (m[3] === "-") negatives.push(t);
      else groups.push(t);
    }
  }
  if (!groups.length) return null;
  if (opts.any && groups.length < 2) return null;
  let out = groups.join(opts.any ? " OR " : " AND ");
  if (negatives.length) out = `(${out}) NOT ${negatives.join(" NOT ")}`;
  return out;
}

/** The query's content words, lower-cased, without function words or one-letter fragments: what a hit should contain. */
export function contentWords(input: string): string[] {
  const words = clean(input.replace(/"/g, " ")).split(" ").filter((w) => w.length >= 2);
  const content = words.filter((w) => !STOP.has(w) && !/^or$/.test(w));
  return content.length ? content : words;
}

/** English and Roman Urdu function words: never worth a prefix match when a content word is present. */
const STOP = new Set(
  "a an the and of to in on at for is are be by with from how what why when where who which do does did i my me you your it its this that can should will about into ka ki ke ko se me mein hai hain kya kaise kahan kitna kitni kab kaun ho hota hoti".split(" "),
);

function clean(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * One word as a quoted FTS5 token; prefix-matched unless it is a negation. A hyphenated or dotted word
 * ("k-electric", "usd-pkr") is the AND of its parts, because the tokenizer indexed the parts and the documents
 * write them in either order ("USD to PKR"). One-letter parts are dropped: "k"* would match half the index.
 */
function term(word: string, negated = false): string {
  const parts = clean(word)
    .split(" ")
    .filter((p) => p.length >= 2)
    .map((p) => (!negated && p.length > 4 && /s$/.test(p) && !/ss$/.test(p) ? p.slice(0, -1) : p))
    .map((p) => (negated ? `"${p}"` : `"${p}"*`));
  if (!parts.length) return "";
  return parts.length === 1 ? parts[0]! : negated ? parts.join(" NOT ") : `(${parts.join(" AND ")})`;
}
