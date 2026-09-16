import Link from "next/link";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { listArticles } from "@/db/queries/content";
import { articleUrl } from "@/components/cards";
import { formatDate } from "@/lib/format";
import { groupMatches, readMatches, type MatchT } from "@/lib/match-today";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";

export const revalidate = 600;

const time = (iso: string) => formatDate(iso, { hour: "numeric", minute: "2-digit", hour12: true });
const day = (iso: string) => formatDate(iso, { weekday: "short", day: "numeric", month: "short" });

export async function generateMetadata() {
  const set = await readMatches();
  const g = groupMatches(set);
  const m = g.live[0] ?? g.today[0];
  const next = g.upcoming[0];
  const title = m ? `Today's Cricket Match: ${m.title}, ${time(m.startAt)} PKT, ${m.status === "live" ? "Live Score" : "Where to Watch"}` : next ? `Cricket Today: No Match Today, Next ${next.title} on ${day(next.startAt)}` : "Cricket Today: Pakistan Matches, PSL, Schedules and Scores";
  return buildMetadata({
    title,
    description: m ? `${m.title} (${m.competition}${m.format ? `, ${m.format}` : ""}) ${m.status === "live" ? `is live: ${m.score ?? ""}` : `starts at ${time(m.startAt)} Pakistan time${m.venue ? ` at ${m.venue}` : ""}`}. ${m.watch ? `Watch on ${m.watch}. ` : ""}Today's fixtures, results and the week ahead, updated through the day.` : "Is there a cricket match today? Today's Pakistan fixtures, PSL and international schedules with start times in PKT, where to watch, live score links and yesterday's results, updated through the day.",
    path: "/cricket-today",
    kicker: "Cricket today",
  });
}

function MatchRow({ m, big = false }: { m: MatchT; big?: boolean }) {
  return (
    <div className={`grid gap-1 border-b border-line py-3 sm:grid-cols-[1fr_auto] sm:items-baseline ${big ? "text-[16px]" : "text-[15px]"}`}>
      <div>
        <p className={`font-semibold ${big ? "font-display text-2xl" : ""}`}>
          {m.href ? (
            <Link href={m.href} className="underline-offset-4 hover:underline">
              {m.title}
            </Link>
          ) : (
            m.title
          )}
          {m.status === "live" ? <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">Live</span> : null}
        </p>
        <p className="text-[13.5px] text-2">
          {m.competition}
          {m.format ? ` · ${m.format}` : ""}
          {m.venue ? ` · ${m.venue}` : ""}
        </p>
        {m.score ? <p className="mt-1 tabular font-medium">{m.score}</p> : null}
        {m.result ? <p className="mt-0.5 text-[14px]">{m.result}</p> : null}
        {m.watch && m.status !== "finished" ? <p className="mt-0.5 text-[13.5px] text-2">Watch: {m.watch}</p> : null}
      </div>
      <p className="tabular text-2">
        {day(m.startAt)}, {time(m.startAt)} PKT
      </p>
    </div>
  );
}

export default async function CricketTodayPage() {
  const [set, stories] = await Promise.all([readMatches(), listArticles({ kind: "news", limit: 6, categorySlug: "cricket" })]);
  const g = groupMatches(set);
  const lead = g.live[0] ?? g.today[0];
  const crumbs = [
    { name: "Today", path: "/today" },
    { name: "Cricket today", path: "/cricket-today" },
  ];
  const faqs = [
    { question: "Is there a cricket match today?", answer: g.today.length ? `Yes: ${g.today.map((m) => `${m.title} (${m.competition}) at ${time(m.startAt)} PKT`).join("; ")}.` : g.upcoming[0] ? `No match today. The next is ${g.upcoming[0].title} (${g.upcoming[0].competition}) on ${day(g.upcoming[0].startAt)} at ${time(g.upcoming[0].startAt)} PKT.` : "No fixture is listed for today; check the PSL and international schedules below." },
    ...(lead?.watch ? [{ question: `Where can I watch ${lead.title}?`, answer: `${lead.watch}. Times are Pakistan Standard Time.` }] : []),
    { question: "Where do the fixtures come from?", answer: `The PCB, ICC and league schedules, with a link on each fixture. Times are converted to Pakistan Standard Time. Scores are updated during the day${set.updatedAt ? `; last update ${formatDate(set.updatedAt, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })} PKT` : ""}.` },
  ];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(faqs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" eyebrow={formatDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })} title="Cricket today" description="Today's Pakistan fixtures and the matches Pakistanis follow, with start times in PKT, where to watch, scores and the week ahead." />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="border-t-2 border-[var(--rule)]">
            {g.today.length ? g.today.map((m) => <MatchRow key={m.id} m={m} big />) : <p className="border-b border-line py-4 text-[15px] text-2">No match today.{g.upcoming[0] ? ` Next: ${g.upcoming[0].title}, ${day(g.upcoming[0].startAt)} at ${time(g.upcoming[0].startAt)} PKT.` : ""}</p>}
          </div>
          {g.upcoming.length ? (
            <>
              <SectionHeader title="Coming up" className="mt-8" />
              <div className="border-t border-line">
                {g.upcoming.map((m) => (
                  <MatchRow key={m.id} m={m} />
                ))}
              </div>
            </>
          ) : null}
          {g.recent.length ? (
            <>
              <SectionHeader title="Results" className="mt-8" />
              <div className="border-t border-line">
                {g.recent.map((m) => (
                  <MatchRow key={m.id} m={m} />
                ))}
              </div>
            </>
          ) : null}
          <SectionHeader title="Questions" className="mt-10" />
          <div className="divide-y divide-[var(--border)] border-y border-line">
            {faqs.map((f) => (
              <details key={f.question} className="py-3">
                <summary className="cursor-pointer list-none font-semibold">{f.question}</summary>
                <p className="mt-2 text-[15px] text-2">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
        <aside className="space-y-8">
          {stories.length ? (
            <div>
              <p className="eyebrow">Cricket news</p>
              <ul className="mt-2 space-y-2 text-[15px]">
                {stories.map((a) => (
                  <li key={a.id}>
                    <Link href={articleUrl(a)} className="underline-offset-4 hover:underline">
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/news/cricket" className="mt-2 inline-block text-[14px] font-medium underline-offset-4 hover:underline">
                All cricket news →
              </Link>
            </div>
          ) : null}
          <div>
            <p className="eyebrow">Schedules and tables</p>
            <ul className="mt-2 space-y-1 text-[15px]">
              <li>
                <Link href="/news/cricket/psl-2026-schedule-results-points-table" className="underline-offset-4 hover:underline">
                  PSL schedule and points table
                </Link>
              </li>
              <li>
                <Link href="/news/cricket/t20-world-cup-pakistan-schedule-results" className="underline-offset-4 hover:underline">
                  T20 World Cup: Pakistan&apos;s schedule
                </Link>
              </li>
              <li>
                <Link href="/news/sports" className="underline-offset-4 hover:underline">
                  All sport
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
