import assert from "node:assert/strict";
import { test } from "node:test";

/*
 * Contract suite for the frozen admin API (docs/ADMIN-API.md, "Response shapes"). It runs against a live
 * instance and is the migration's definition of done:
 *
 *   CONTRACT_BASE_URL=https://searchable.sooviaan.workers.dev CONTRACT_ADMIN_KEY=<key> npm run contract
 *
 * Without those variables every test is skipped, so `npm test` stays offline. Writes use drafts and undo themselves.
 */
const base = process.env.CONTRACT_BASE_URL?.replace(/\/$/, "");
const key = process.env.CONTRACT_ADMIN_KEY;
const skip = !base || !key ? "CONTRACT_BASE_URL and CONTRACT_ADMIN_KEY not set" : false;

async function call(method: string, path: string, body?: unknown, auth: string | null = key ?? null): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${base}/api/admin${path}`, {
    method,
    headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, json };
}
const keys = (o: Record<string, unknown>, ...want: string[]) => {
  for (const k of want) assert.ok(k in o, `missing key "${k}" in ${JSON.stringify(Object.keys(o))}`);
};

test("auth: no key and a wrong key are refused with 401 and an error message", { skip }, async () => {
  const none = await call("GET", "/context", undefined, null);
  assert.equal(none.status, 401);
  assert.equal(typeof none.json.error, "string");
  const wrong = await call("GET", "/context", undefined, "spk_" + "0".repeat(64));
  assert.equal(wrong.status, 401);
});

test("validation errors come back as 400 with issues[]", { skip }, async () => {
  const r = await call("POST", "/report", { slot: "x" });
  assert.equal(r.status, 400);
  assert.equal(r.json.error, "Invalid input");
  assert.ok(Array.isArray(r.json.issues));
});

test("unknown ids are 404", { skip }, async () => {
  const r = await call("GET", "/articles/00000000-0000-0000-0000-000000000000");
  assert.equal(r.status, 404);
});

test("GET /context", { skip }, async () => {
  const r = await call("GET", "/context");
  assert.equal(r.status, 200);
  keys(r.json, "site", "now", "nowKarachi", "recentArticles", "drafts", "scheduled", "queues", "directory", "newsDesks", "data", "topSearches", "searchesWithNoResults", "email", "lastJobsRun", "lastIngestion", "weekSince");
  assert.ok(Array.isArray(r.json.recentArticles));
  assert.ok(Array.isArray(r.json.data));
});

test("GET /reference", { skip }, async () => {
  const r = await call("GET", "/reference");
  assert.equal(r.status, 200);
  keys(r.json, "articleKinds", "newsCategories", "guideCategories", "businessCategories", "cities", "areas", "entities", "dataSeries", "professions", "tools", "authors", "articleStatuses");
  assert.ok((r.json.cities as unknown[]).length > 0);
});

test("GET /ideas", { skip }, async () => {
  const r = await call("GET", "/ideas?topic=general&region=pk&limit=5");
  assert.equal(r.status, 200);
  keys(r.json, "headlines");
});

test("GET /backlog", { skip }, async () => {
  const r = await call("GET", "/backlog");
  assert.equal(r.status, 200);
  keys(r.json, "items");
});

test("GET /queue", { skip }, async () => {
  const r = await call("GET", "/queue");
  assert.equal(r.status, 200);
  keys(r.json, "businesses", "claims", "professionals", "posts", "comments", "businessReviews", "professionalReviews", "reports", "messages", "submissions");
});

test("GET /articles, /businesses, /data, /front, /prices, /compare, /match, /today, /posts, /inbox, /newsletter, /report", { skip }, async () => {
  const checks: [string, string[]][] = [
    ["/articles?limit=3", ["articles"]],
    ["/businesses?limit=3", ["businesses"]],
    ["/data", ["series"]],
    ["/front", ["front"]],
    ["/prices?category=mobiles", ["category", "reviewedAt", "count", "items"]],
    ["/compare?slug=air-conditioners", ["slug", "items", "reviewedAt", "source"]],
    ["/match", ["updatedAt", "matches"]],
    ["/today", ["date", "pakistan", "umalqura", "offset"]],
    ["/posts?kind=job", ["kind", "posts"]],
    ["/inbox?limit=3", ["messages"]],
    ["/newsletter", ["issues", "suggestedDraft"]],
    ["/report", ["reports"]],
  ];
  for (const [path, want] of checks) {
    const r = await call("GET", path);
    assert.equal(r.status, 200, `${path} -> ${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
    keys(r.json, ...want);
  }
});

test("article lifecycle: draft, read, patch, delete", { skip }, async () => {
  const created = await call("POST", "/articles", {
    kind: "guide",
    title: `Contract suite check ${Date.now()}`,
    dek: "A draft written by the contract suite and deleted right after.",
    body: "## Contract\n\nThis draft exists for a few seconds while the contract suite checks the admin API shapes. It is deleted at the end of the test.",
    category: "utilities",
    tags: ["contract"],
    intent: "draft",
  });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  keys(created.json, "ok", "id", "status", "url", "image");
  assert.equal(created.json.status, "draft");
  const id = created.json.id as string;
  try {
    const got = await call("GET", `/articles/${id}`);
    assert.equal(got.status, 200);
    keys(got.json, "article");
    const patched = await call("PATCH", `/articles/${id}`, { slug: `contract-suite-check-${Date.now()}` });
    assert.equal(patched.status, 200, JSON.stringify(patched.json));
    keys(patched.json, "ok", "id", "status", "url", "image");
  } finally {
    const del = await call("DELETE", `/articles/${id}`);
    assert.equal(del.status, 200);
    keys(del.json, "ok", "deleted");
  }
});

test("POST /report files a run report that GET /report returns", { skip }, async () => {
  const r = await call("POST", "/report", { slot: "contract", report: "Contract suite run: read the API, published nothing." });
  assert.equal(r.status, 200);
  keys(r.json, "ok", "id", "at");
  const list = await call("GET", "/report");
  assert.ok((list.json.reports as { id: string }[]).some((x) => x.id === r.json.id));
});

test("POST /media search lists candidates", { skip }, async () => {
  const r = await call("POST", "/media", { search: "Karachi skyline" });
  assert.equal(r.status, 200, JSON.stringify(r.json).slice(0, 200));
  keys(r.json, "candidates");
});

test("POST /jobs revalidate answers with the paths", { skip }, async () => {
  const r = await call("POST", "/jobs", { job: "revalidate", paths: ["/"] });
  assert.equal(r.status, 200);
  keys(r.json, "ok", "revalidated");
});
