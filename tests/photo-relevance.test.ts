import assert from "node:assert/strict";
import { test } from "node:test";
import { STRICT_MIN_SCORE, relevanceScore } from "../src/lib/open-images";

/* ADR-51: a news photo must describe the story. These are the cases from the first live day. */

test("a shrine in Kohat does not illustrate the Kohat police lines attack", () => {
  const s = relevanceScore("Ghamkol Shareef Kohat, KPK Pakistan; shrine, sufi", { query: "Kohat police lines", entities: ["Kohat Police Lines"], headline: "Kohat attack: 31 dead, 16 of them police, gunmen still holed up on day two" });
  assert.ok(s < STRICT_MIN_SCORE, `scored ${s}`);
});

test("the Supreme Court building illustrates a Supreme Court ruling", () => {
  const s = relevanceScore("Supreme Court of Pakistan building, Islamabad", { query: "Supreme Court of Pakistan building", entities: ["Supreme Court"], headline: "Supreme Court: register the FIR at once, or IGPs face contempt" });
  assert.ok(s >= STRICT_MIN_SCORE, `scored ${s}`);
});

test("a full entity match outranks a partial one, and both outrank a query-only match", () => {
  const about = { query: "court hearing Islamabad", entities: ["Islamabad High Court"], headline: "IHC bars any march on Islamabad" };
  const full = relevanceScore("Islamabad High Court building during a hearing", about);
  const partial = relevanceScore("A court hearing room, Islamabad", about);
  const queryOnly = relevanceScore("Hearing at a tribunal in Islamabad", about);
  assert.ok(full > partial && partial > queryOnly, `${full} ${partial} ${queryOnly}`);
});

test("stock subjects are pushed under the bar for hard news unless asked for", () => {
  const flag = relevanceScore("Flag of Pakistan flying over Islamabad", { query: "Islamabad march ban", entities: ["Islamabad High Court"], headline: "IHC bars any march on Islamabad" });
  assert.ok(flag < STRICT_MIN_SCORE, `scored ${flag}`);
  const askedFor = relevanceScore("Flag of Pakistan flying over Islamabad", { query: "Pakistan flag Islamabad" });
  assert.ok(askedFor >= STRICT_MIN_SCORE, `scored ${askedFor}`);
});

test("no specific query word matched means zero, whatever else lines up", () => {
  assert.equal(relevanceScore("Karachi Port Trust head office", { query: "Kohat attack", entities: ["Karachi Port Trust"] }), 0);
});
