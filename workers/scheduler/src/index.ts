/**
 * Scheduler Worker: turns Cron Triggers into calls on the site (service binding SITE) and starts the fuel-price
 * Workflow on the 1st and 16th. It holds no logic of its own: publishing, ingestion and pruning live in the site,
 * this only decides when. Secret: CRON_SECRET (the same value as the site's).
 *
 *   every 5 minutes        due jobs (scheduled stories, newsletter sends, plan expiry, invites, digests, inbox)
 *   15 past every hour     market refresh: exchange rates, gold, crypto, KSE-100
 *   02:30 UTC daily        the full run: every source, tools mirror, pruning
 *   10:00 and 13:00 UTC on the 1st and 16th   fuel prices on OGRA days (15:00 and 18:00 PKT) as a retrying Workflow
 */
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

type Env = {
  SITE: { fetch: (input: string | Request, init?: RequestInit) => Promise<Response> };
  FUEL: { create: (opts: { id: string; params?: unknown }) => Promise<unknown> };
  SITE_URL: string;
  CRON_SECRET: string;
};
type Ctx = { waitUntil(p: Promise<unknown>): void };

const HOURLY = ["usd-pkr", "aed-pkr", "sar-pkr", "gbp-pkr", "eur-pkr", "gold-24k-tola", "gold-22k-tola", "gold-21k-tola", "silver-tola", "kse-100", "btc-usd", "eth-usd"];
const FUEL = ["petrol-price", "diesel-price"];

async function site(env: Env, path: string): Promise<{ status: number; body: unknown }> {
  const res = await env.SITE.fetch(`${env.SITE_URL}${path}`, { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return { status: res.status, body };
}

async function runCron(cron: string, scheduledTime: number, env: Env): Promise<{ status: number; body: unknown }> {
  switch (cron) {
    case "*/5 * * * *":
      return site(env, "/api/cron/publish");
    case "15 * * * *":
      return site(env, `/api/cron/ingest?only=${HOURLY.join(",")}`);
    case "30 2 * * *":
      return site(env, "/api/cron/ingest");
    case "0 10,13 1,16 * *": {
      // One instance per day: the second trigger finds it already running or finished and does nothing.
      const id = `fuel-${new Date(scheduledTime).toISOString().slice(0, 10)}`;
      try {
        await env.FUEL.create({ id });
        return { status: 202, body: { started: id } };
      } catch (e) {
        return { status: 200, body: { existing: id, note: (e as Error).message } };
      }
    }
    default:
      return { status: 204, body: { ignored: cron } };
  }
}

const worker = {
  async scheduled(event: { cron: string; scheduledTime: number }, env: Env, ctx: Ctx) {
    ctx.waitUntil(
      runCron(event.cron, event.scheduledTime, env)
        .then((r) => console.log(JSON.stringify({ cron: event.cron, ...r })))
        .catch((e) => console.error(JSON.stringify({ cron: event.cron, error: (e as Error).message }))),
    );
  },
  /** Manual trigger for checks: POST /run/<cron expression> with the CRON_SECRET; GET / answers a health line. */
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    if (url.pathname === "/") return new Response("searchable-scheduler", { headers: { "content-type": "text/plain" } });
    if (req.method === "POST" && url.pathname.startsWith("/run/")) {
      if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) return new Response("unauthorized", { status: 401 });
      const cron = decodeURIComponent(url.pathname.slice(5));
      try {
        return Response.json({ ok: true, cron, ...(await runCron(cron, Date.now(), env)) });
      } catch (e) {
        return Response.json({ ok: false, cron, error: (e as Error).message }, { status: 502 });
      }
    }
    return new Response("not found", { status: 404 });
  },
};
export default worker;

type FuelResult = { results: { slug: string; status: string; value?: number; previous?: number; message?: string }[]; errors: string[] };

/**
 * OGRA revises petrol and diesel on the 1st and 16th and the notice lands any time in the afternoon. The Workflow
 * asks the site to ingest the two series and, while neither has changed, fails the step so the retry policy tries
 * again: five attempts ten minutes apart, doubling, so a late notice is still caught. addDataPoint upserts on
 * (series, date) and the draft slug carries the date, so a re-run never doubles anything.
 */
export class FuelPriceWorkflow extends WorkflowEntrypoint<Env, unknown> {
  async run(event: WorkflowEvent<unknown>, step: WorkflowStep) {
    const fuel = await step.do("ingest petrol and diesel", { retries: { limit: 5, delay: "10 minutes", backoff: "exponential" }, timeout: "2 minutes" }, async () => {
      const { body } = await site(this.env, `/api/cron/ingest?only=${FUEL.join(",")}`);
      const r = body as FuelResult;
      const mine = r.results.filter((x) => FUEL.includes(x.slug));
      const failed = mine.filter((x) => x.status === "error" || x.status === "rejected");
      if (failed.length) throw new Error(failed.map((x) => `${x.slug}: ${x.message ?? x.status}`).join("; "));
      if (!mine.some((x) => x.status === "written")) throw new Error(`no new fuel price yet (${mine.map((x) => `${x.slug} ${x.status}`).join(", ")}${r.errors.length ? "; " + r.errors.join("; ") : ""})`);
      return mine;
    });
    // The drafts the ingest made are picked up by the next due-jobs run; running it now shortens the wait.
    await step.do("due jobs", async () => site(this.env, "/api/cron/publish"));
    return { instance: event.instanceId, fuel };
  }
}
