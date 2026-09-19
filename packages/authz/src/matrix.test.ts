import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTORS, MATRIX, OPERATIONS, RESOURCES, atLeast, can, type Actor } from "./index";

/*
 * Every cell of the matrix, including the denials. The expected table is written out by hand so a change to
 * MATRIX has to be matched by a change here: that is the point of keeping policy as data.
 */

const expectAll = (op: Parameters<typeof can>[1], resource: Parameters<typeof can>[2], allowed: Actor[], own?: boolean) => {
  for (const a of ACTORS) assert.equal(can(a, op, resource, own === undefined ? {} : { own }), allowed.includes(a), `${a} ${op} ${resource}${own === undefined ? "" : ` own=${own}`}`);
};

test("public reading needs no account", () => {
  for (const r of ["article", "business", "professional", "post", "comment", "review", "profile", "data", "search"] as const) expectAll("read", r, ACTORS);
});

test("editing content is the desk's", () => {
  for (const op of ["create", "update", "publish", "delete"] as const) expectAll(op, "article", ["editor", "admin"]);
  expectAll("moderate", "business", ["editor", "admin"]);
  expectAll("moderate", "post", ["editor", "admin"]);
  expectAll("moderate", "comment", ["editor", "admin"]);
  expectAll("moderate", "review", ["editor", "admin"]);
  expectAll("moderate", "claim", ["editor", "admin"]);
  expectAll("update", "data", ["editor", "admin"]);
  expectAll("update", "jobs", ["editor", "admin"]);
  expectAll("respond", "inbox", ["editor", "admin"]);
});

test("owners act on their own things, the desk on any", () => {
  expectAll("update", "business", ["user", "business_owner", "editor", "admin"], true);
  expectAll("update", "business", ["editor", "admin"], false);
  expectAll("update", "post", ["user", "business_owner", "editor", "admin"], true);
  expectAll("delete", "comment", ["editor", "admin"], false);
  expectAll("respond", "review", ["user", "business_owner", "editor", "admin"], true);
  expectAll("respond", "review", ["editor", "admin"], false);
  expectAll("create", "media", ["user", "business_owner", "editor", "admin"], true);
  expectAll("create", "media", ["editor", "admin"], false);
});

test("orders are the buyer's or the admin's", () => {
  expectAll("read", "order", ["user", "business_owner", "editor", "admin"], true);
  expectAll("read", "order", ["admin"], false);
  expectAll("update", "order", ["admin"]);
  expectAll("buy", "order", ["user", "business_owner", "editor", "admin"]);
});

test("accounts, settings and API keys are admin only", () => {
  for (const r of ["settings", "user", "api_key"] as const) for (const op of Object.keys(MATRIX[r]) as (keyof (typeof MATRIX)[typeof r])[]) expectAll(op, r, ["admin"]);
});

test("anyone may submit a business, a review, a report or subscribe; signing in is needed to post, claim or upload", () => {
  expectAll("create", "business", ACTORS);
  expectAll("create", "review", ACTORS);
  expectAll("create", "report", ACTORS);
  expectAll("create", "newsletter", ACTORS);
  expectAll("create", "post", ["user", "business_owner", "editor", "admin"]);
  expectAll("create", "claim", ["user", "business_owner", "editor", "admin"]);
  expectAll("create", "professional", ["user", "business_owner", "editor", "admin"]);
});

test("an operation the matrix does not list is denied for everyone, and null means anonymous", () => {
  for (const r of RESOURCES) for (const op of OPERATIONS) if (!MATRIX[r][op]) for (const a of ACTORS) assert.equal(can(a, op, r), false, `${a} ${op} ${r}`);
  assert.equal(can(null, "read", "article"), true);
  assert.equal(can(undefined, "create", "post"), false);
});

test("atLeast is the role ladder", () => {
  assert.equal(atLeast("admin", "editor"), true);
  assert.equal(atLeast("business_owner", "editor"), false);
  assert.equal(atLeast(null, "anonymous"), true);
});
