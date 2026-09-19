import assert from "node:assert/strict";
import { test } from "node:test";
import { consoleProvider, resendProvider, type Message } from "./index";

const msg: Message = { from: "Searchable <daily@searchable.pk>", to: "a@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi", replyTo: "hello@searchable.pk", headers: { "In-Reply-To": "<x@y>" } };

test("the Resend provider posts one JSON request with the key and maps the reply", async () => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({ id: "em_123" }), { status: 200 });
  }) as typeof fetch;
  const r = await resendProvider("re_test", fetchImpl).send(msg);
  assert.equal(r.id, "em_123");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, "https://api.resend.com/emails");
  const headers = calls[0]!.init.headers as Record<string, string>;
  assert.equal(headers.authorization, "Bearer re_test");
  const body = JSON.parse(String(calls[0]!.init.body));
  assert.deepEqual(body.to, ["a@example.com"]);
  assert.equal(body.reply_to, "hello@searchable.pk");
  assert.equal(body.headers["In-Reply-To"], "<x@y>");
});

test("a provider error becomes a thrown Error with status and message", async () => {
  const fetchImpl = (async () => new Response(JSON.stringify({ name: "validation_error", message: "Invalid `to`" }), { status: 422 })) as typeof fetch;
  await assert.rejects(resendProvider("re_test", fetchImpl).send(msg), /resend 422 validation_error: Invalid `to`/);
});

test("the console provider logs and never sends", async () => {
  const lines: string[] = [];
  const r = await consoleProvider("none", (l) => lines.push(l)).send(msg);
  assert.match(r.id, /^none-/);
  assert.equal(lines.length, 1);
  assert.match(lines[0]!, /Hi -> a@example.com/);
});
