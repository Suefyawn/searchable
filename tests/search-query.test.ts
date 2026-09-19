import assert from "node:assert/strict";
import { test } from "node:test";
import { contentWords, toFtsQuery } from "../src/lib/fts-query";
import { trigramMatch, trigramSimilarity, wordSimilarity } from "../src/lib/fuzzy";

/* The query translator and the typo measure are pure; the ranking itself needs D1 and is checked on staging (docs/SEARCH.md). */

test("plain words are prefix-matched and ANDed", () => {
  assert.equal(toFtsQuery("petrol price"), '"petrol"* AND "price"*');
  assert.equal(toFtsQuery("electri"), '"electri"*');
});

test("quotes, OR groups and exclusions come through", () => {
  assert.equal(toFtsQuery('"full tank" petrol -diesel'), '("full tank" AND "petrol"*) NOT "diesel"');
  assert.equal(toFtsQuery("(bijli OR electricity) bill"), '("bijli"* OR "electricity"*) AND "bill"*');
  assert.equal(toFtsQuery("petrol OR diesel"), '"petrol"* AND "diesel"*'); // a bare OR outside parentheses is ignored, like websearch_to_tsquery
});

test("a trailing plural s is dropped from longer words", () => {
  assert.equal(toFtsQuery("prices"), '"price"*');
  assert.equal(toFtsQuery("gas"), '"gas"*');
  assert.equal(toFtsQuery("class"), '"class"*');
});

test("function words are dropped when a content word remains, kept when nothing else is there", () => {
  assert.equal(toFtsQuery("how to become filer"), '"become"* AND "filer"*');
  assert.equal(toFtsQuery("petrol ka rate kya hai"), '"petrol"* AND "rate"*');
  assert.equal(toFtsQuery("how to"), '"how"* AND "to"*');
  assert.equal(toFtsQuery("-the petrol"), '("petrol"*) NOT "the"');
});

test("any mode ORs the groups and is null for a single group", () => {
  assert.equal(toFtsQuery("kesc duplicate bill", { any: true }), '"kesc"* OR "duplicate"* OR "bill"*');
  assert.equal(toFtsQuery("petrol", { any: true }), null);
});

test("nothing searchable gives null and punctuation is stripped", () => {
  assert.equal(toFtsQuery("!!! ?"), null);
  assert.equal(toFtsQuery("k-electric bill"), '"electric"* AND "bill"*'); // hyphen parts are ANDed, one-letter parts dropped
  assert.equal(toFtsQuery("usd-pkr rates"), '("usd"* AND "pkr"*) AND "rate"*');
  assert.equal(toFtsQuery("x"), null);
});

test("word similarity forgives a typo in one word of a long title", () => {
  assert.ok(wordSimilarity("Petrol price in Pakistan today", "petrl price") > 0.5);
  assert.ok(wordSimilarity("Zakat Calculator 2026", "zakaat calculater") > 0.5);
  assert.ok(wordSimilarity("Rs 200 prize bond draw", "petrl price") < 0.3);
  assert.ok(trigramSimilarity("Petrol price in Pakistan today", "petrl price") < 0.3, "whole-string similarity is what the word measure replaces");
});

test("trigram MATCH lists the query's trigrams as OR terms", () => {
  assert.equal(trigramMatch("ab"), null);
  assert.equal(trigramMatch("petrol"), '"pet" OR "etr" OR "tro" OR "rol"');
});

test("content words drop function words and fragments, but keep a query made only of them", () => {
  assert.deepEqual(contentWords('how to become "a filer" k-electric'), ["become", "filer", "electric"]);
  assert.deepEqual(contentWords("how to"), ["how", "to"]);
});
