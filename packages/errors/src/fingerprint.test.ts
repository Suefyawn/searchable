import assert from "node:assert/strict";
import { test } from "node:test";
import { describe, fingerprint, normaliseFrame, normaliseRoute } from "./index";

test("the same bug on the same route is one fingerprint whatever the message or line number", async () => {
  const a = await fingerprint({ route: "/b/[slug]", name: "TypeError", message: "Cannot read x of undefined (id 42)", topFrame: "at render (/dist/server/b.js:10:5)" });
  const b = await fingerprint({ route: "/b/[slug]", name: "TypeError", message: "Cannot read x of undefined (id 43)", topFrame: "at render (/dist/server/b.js:10:5)" });
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{16}$/);
});

test("another route or another error type is another fingerprint", async () => {
  const base = { name: "TypeError", message: "m", topFrame: "at f (x.js)" };
  const a = await fingerprint({ route: "/b/[slug]", ...base });
  assert.notEqual(a, await fingerprint({ route: "/p/[slug]", ...base }));
  assert.notEqual(a, await fingerprint({ route: "/b/[slug]", ...base, name: "RangeError" }));
});

test("frames lose line and column numbers and hosts; routes lose ids", () => {
  assert.equal(normaliseFrame("at render (https://searchable.pk/_next/static/chunks/app.js:10:5)"), "at render (/_next/static/chunks/app.js)");
  assert.equal(normaliseFrame("at f (file:///dist/server/x.js?v=abc:3:4)"), "at f (file:///dist/server/x.js)");
  assert.equal(normaliseRoute("/orders/5f0c1d2e-1111-2222-3333-444455556666/receipt?x=1"), "/orders/:id/receipt");
  assert.equal(normaliseRoute("/news/page/12"), "/news/page/:n");
});

test("describe picks the first application frame", () => {
  const err = new Error("boom");
  err.stack = "Error: boom\n    at Object.<anonymous> (node:internal/x:1:1)\n    at helper (/app/node_modules/lib/index.js:5:5)\n    at run (/app/src/lib/jobs.ts:73:9)\n    at next (/app/src/x.ts:1:1)";
  const d = describe(err);
  assert.equal(d.name, "Error");
  assert.equal(d.message, "boom");
  assert.equal(d.topFrame, "at run (/app/src/lib/jobs.ts)");
  assert.equal(describe("a string").message, "a string");
  assert.equal(describe(null).topFrame, null);
});
