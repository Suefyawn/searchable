import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";

/*
 * Today's cricket (and any other sport) fixtures: a small living row the scheduled task sets at Dawn and
 * Evening from the PCB, ICC or league schedule and updates with the score as the day goes on. Rendered at
 * /cricket-today, on /today and as the first cell of the home ticker on match days. Nothing is fetched from
 * a sports API: the task is the source, with a URL for each fixture.
 */

export const Match = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  /** "Pakistan vs India" */
  title: z.string().trim().min(3).max(120),
  /** "Asia Cup 2026", "PSL 11", "Bangladesh tour of Pakistan" */
  competition: z.string().trim().max(120),
  /** "T20I", "ODI", "Test", "T20" */
  format: z.string().trim().max(20).optional(),
  venue: z.string().trim().max(120).optional(),
  /** Scheduled start, ISO with offset. */
  startAt: z.string().datetime({ offset: true }),
  status: z.enum(["upcoming", "live", "finished", "abandoned"]).default("upcoming"),
  /** "PAK 187/4 (20) v IND 120/8 (15.2)" while live or after. */
  score: z.string().trim().max(200).optional(),
  /** "Pakistan won by 5 wickets" */
  result: z.string().trim().max(200).optional(),
  /** "PTV Sports, Ten Sports; Tamasha and Tapmad apps" */
  watch: z.string().trim().max(200).optional(),
  /** Our own living page for the series or tournament. */
  href: z.string().trim().max(300).optional(),
  sourceUrl: z.string().url().max(300),
  sport: z.string().trim().max(30).default("cricket"),
});
export type MatchT = z.infer<typeof Match>;

export const MatchSet = z.object({ matches: z.array(Match).max(30).default([]), updatedAt: z.string().optional() });
export type MatchSetT = z.infer<typeof MatchSet>;

const KEY = "today:match";

export async function readMatches(): Promise<MatchSetT> {
  const db = await getDb();
  const row = await db.query.settings.findFirst({ where: eq(schema.settings.key, KEY) });
  const parsed = MatchSet.safeParse(row?.value ?? {});
  return parsed.success ? parsed.data : { matches: [] };
}

export async function writeMatches(matches: MatchT[]): Promise<MatchSetT> {
  const ids = new Set<string>();
  for (const m of matches) {
    if (ids.has(m.id)) throw new Error(`Duplicate id ${m.id}`);
    ids.add(m.id);
  }
  const value: MatchSetT = { matches: [...matches].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)), updatedAt: new Date().toISOString() };
  const db = await getDb();
  await db.insert(schema.settings).values({ key: KEY, value }).onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
  return value;
}

/** Pakistan's civil day (YYYY-MM-DD) of an instant. */
export function pkDay(iso: string | Date): string {
  return new Date(new Date(iso).getTime() + 5 * 3_600_000).toISOString().slice(0, 10);
}

/** Split into today's fixtures (Pakistan time), the next ones, and yesterday's results still worth showing. */
export function groupMatches(set: MatchSetT, now = new Date()) {
  const today = pkDay(now);
  const cutoff = now.getTime() - 36 * 3_600_000;
  const live = set.matches.filter((m) => m.status === "live");
  const todays = set.matches.filter((m) => pkDay(m.startAt) === today);
  const upcoming = set.matches.filter((m) => pkDay(m.startAt) > today && m.status === "upcoming");
  const recent = set.matches.filter((m) => pkDay(m.startAt) < today && Date.parse(m.startAt) > cutoff && (m.status === "finished" || m.status === "abandoned"));
  return { today: todays, live, upcoming, recent };
}

/** The one line for the ticker: the live match with its score, else today's first fixture with its time. */
export function tickerLine(set: MatchSetT, now = new Date()): { name: string; text: string; href: string } | null {
  const g = groupMatches(set, now);
  const m = g.live[0] ?? g.today[0];
  if (!m) return null;
  const time = new Intl.DateTimeFormat("en-PK", { timeZone: "Asia/Karachi", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(m.startAt));
  return { name: m.status === "live" ? "Live" : "Today", text: m.status === "live" && m.score ? `${m.title}: ${m.score}` : `${m.title}, ${time}`, href: "/cricket-today" };
}
