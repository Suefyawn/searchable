import { adminKey } from "./_api";

/*
 * One scripted editorial slot against a running instance, the way the Cowork task works (docs/DAILY-TASK.md):
 * read context and reference, look at the queue, file a draft, publish it, check it is live, file the run report,
 * then delete the story again. Used as the migration's acceptance check on staging and production.
 *
 *   BASE_URL=https://searchable.sooviaan.workers.dev ADMIN_API_KEY=<key> npx tsx scripts/fake-slot.ts
 */
const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const key = adminKey();

async function api<T = Record<string, unknown>>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${base}/api/admin${path}`, { method, headers: { authorization: `Bearer ${key}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${json.error ?? JSON.stringify(json).slice(0, 200)}`);
  return json;
}
const step = (label: string, detail: string) => console.log(`${label.padEnd(26)} ${detail}`);

async function main() {
  const t0 = Date.now();
  const ctx = await api<{ nowKarachi: string; recentArticles: unknown[]; queues: Record<string, number>; data: { slug: string; latest?: { value: number } }[] }>("GET", "/context");
  step("GET /context", `${ctx.nowKarachi}, ${ctx.recentArticles.length} recent stories, ${ctx.data.length} data series`);
  const ref = await api<{ guideCategories: { slug: string }[]; cities: { slug: string }[] }>("GET", "/reference");
  step("GET /reference", `${ref.guideCategories.length} guide categories, ${ref.cities.length} cities`);
  const queue = await api<Record<string, unknown[]>>("GET", "/queue");
  step("GET /queue", Object.entries(queue).map(([k, v]) => `${k} ${Array.isArray(v) ? v.length : "?"}`).join(", "));

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const draft = await api<{ id: string; url: string; status: string }>("POST", "/articles", {
    kind: "guide",
    title: `Fake slot run ${stamp}: a story the acceptance check publishes and removes`,
    dek: "Written by scripts/fake-slot.ts to prove the publishing path end to end. It is deleted a few seconds later.",
    body: "## Why this exists\n\nThe migration's acceptance check publishes one story through the same admin API the editorial task uses, confirms it renders, files a run report and deletes it again.\n\n## What it checks\n\n- The draft is stored.\n- Publishing indexes it and purges the pages it touches.\n- The public URL answers.\n- The report lands on /admin/automation.",
    category: ref.guideCategories[0]!.slug,
    tags: ["acceptance"],
    intent: "draft",
  });
  step("POST /articles (draft)", `${draft.id} ${draft.status}`);
  try {
    const live = await api<{ status: string; url: string }>("PATCH", `/articles/${draft.id}`, { intent: "publish" });
    step("PATCH publish", `${live.status} ${live.url}`);
    const page = await fetch(live.url.startsWith("http") ? live.url : base + live.url, { redirect: "follow" });
    step("GET public page", `${page.status} ${page.headers.get("content-type") ?? ""}`);
    if (page.status !== 200) throw new Error(`published story answered ${page.status}`);
    const hits = await fetch(`${base}/api/search?q=${encodeURIComponent("fake slot run acceptance")}`).then((r) => r.json() as Promise<{ hits: { entityId: string }[] }>);
    step("GET /api/search", hits.hits.some((h) => h.entityId === draft.id) ? "story is in the index" : "story NOT in the index yet");
    const report = await api<{ id: string }>("POST", "/report", { slot: "fake-slot", report: `Scripted slot on ${base}: context, reference, queue read; one story drafted, published, verified and removed.`, published: 1, updated: 0, errors: 0 });
    step("POST /report", report.id);
  } finally {
    const del = await api<{ deleted: boolean }>("DELETE", `/articles/${draft.id}`);
    step("DELETE /articles", String(del.deleted));
  }
  console.log(`\nslot complete in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(0);
}
main().catch((e) => {
  console.error("FAILED", e.message ?? e);
  process.exit(1);
});
