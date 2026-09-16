import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { backlogScore } from "../src/lib/backlog";
import { normalizePhone } from "../src/lib/dedupe";
import { businessSlug } from "../src/lib/import";
import { formatPhone } from "../src/lib/format";
import { srcSetFor } from "../src/lib/images";
import { entitiesIn, isRelevant } from "../src/lib/open-images";
import { parseAddress, verifyResendWebhook } from "../src/lib/inbox";
import { renderMarkdown } from "../src/lib/markdown";
import { slugify } from "../src/lib/slug";
import { ramadanWindow, umalquraDate } from "../src/lib/today/hijri";
import { brandSlug, mergePriceItems, priceRange, type PriceItemT } from "../src/lib/prices-shared";
import { describeMag, distanceKm } from "../src/lib/today/quakes";
import { currentPrayer, prayerTimes } from "../src/lib/today/prayer";
import { h12, hhmm, sunTimes } from "../src/lib/today/sun";
import { describeSymbol, feelsLike } from "../src/lib/today/weather";
import { TOOLS } from "../src/tools/registry";

/*
 * Pure-function checks that do not need a database. Run with `npm test` (Node's own runner through tsx).
 * Anything that touches the database is exercised by the go-live checklist and the admin API test instead.
 */

test("slugify strips punctuation and keeps words", () => {
  assert.equal(slugify("Petrol up Rs 2.61: what a full tank costs now"), "petrol-up-rs-261-what-a-full-tank-costs-now");
  assert.equal(slugify("  FBR IRIS  login  "), "fbr-iris-login");
});

test("srcSetFor lists only renditions smaller than the master", () => {
  const url = "https://img.searchable.pk/uploads/2026/09/0f8b6a9e-1e7f-4c8f-9d2e-7b2b9c9f1a11.webp";
  assert.match(srcSetFor(url, 1600)!, /-480\.webp 480w, .*-960\.webp 960w, .* 1600w$/);
  assert.doesNotMatch(srcSetFor(url, 700)!, /-960/);
  assert.equal(srcSetFor("https://example.com/photo.jpg"), undefined);
});

test("markdown tables get a scrolling wrapper and links stay safe", () => {
  const html = renderMarkdown("| A | B |\n|---|---:|\n| 1 | 2 |\n\n[x](https://example.com)");
  assert.match(html, /<div class="table-scroll"><table>/);
  assert.match(html, /style="text-align:right"/);
  assert.match(html, /rel="noopener"/);
});

test("inbox address parsing", () => {
  assert.deepEqual(parseAddress('"Ali Raza" <Ali@Example.com>'), { name: "Ali Raza", address: "ali@example.com" });
  assert.deepEqual(parseAddress("hello@searchable.pk"), { name: null, address: "hello@searchable.pk" });
});

test("resend webhook signature: valid, multi, tampered, missing secret", () => {
  const secret = "whsec_" + Buffer.from("topsecretkey1234567890").toString("base64");
  const body = JSON.stringify({ type: "email.received", data: { email_id: "x" } });
  const id = "msg_1";
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(secret.slice(6), "base64")).update(`${id}.${ts}.${body}`).digest("base64");
  const h = (s: string) => new Headers({ "svix-id": id, "svix-timestamp": ts, "svix-signature": s });
  assert.equal(verifyResendWebhook(h(`v1,${sig}`), body, secret), true);
  assert.equal(verifyResendWebhook(h(`v1,AAAA v1,${sig}`), body, secret), true);
  assert.equal(verifyResendWebhook(h(`v1,${sig}`), body + " ", secret), false);
  assert.equal(verifyResendWebhook(h(`v1,${sig}`), body, undefined), false);
});

test("backlog score favours demand over difficulty", () => {
  assert.ok(backlogScore({ volume: 200_000, kd: 25 }) > backlogScore({ volume: 1_000_000, kd: 73 }));
});

test("every calculator computes its defaults without throwing and returns a headline", () => {
  for (const t of TOOLS) {
    const input = Object.fromEntries(t.fields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default as string | number | boolean]));
    const r = t.compute(input);
    assert.ok(r.headline?.value, `${t.slug} has no headline`);
    assert.ok(r.sections.length > 0, `${t.slug} has no sections`);
    assert.ok(t.sources.length > 0, `${t.slug} lists no source`);
    assert.match(t.lastReviewed ?? "", /^\d{4}-\d{2}-\d{2}$/, `${t.slug} has no review date`);
  }
});

test("income tax: exempt below the threshold, positive above it", () => {
  const tool = TOOLS.find((t) => t.slug === "income-tax-calculator")!;
  const low = tool.compute({ income: 40_000, period: "monthly", kind: "salaried" });
  assert.match(low.summary ?? "", /exempt/i);
  const high = tool.compute({ income: 250_000, period: "monthly", kind: "salaried" });
  assert.doesNotMatch(high.summary ?? "", /exempt/i);
  // pkr() joins "Rs" and the number with a non-breaking space.
  assert.match(high.headline.value, /^Rs\s[\d,]+$/);
});

test("no em dashes in site copy, tools, content or docs", () => {
  const roots = ["src/content", "src/tools", "src/app", "src/components", "docs"];
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|md)$/.test(name) && readFileSync(p, "utf8").includes("—")) offenders.push(p);
    }
  };
  roots.forEach(walk);
  assert.deepEqual(offenders, []);
});

test("headline entities: capitalised names and abbreviations, not sentence starts", () => {
  assert.deepEqual(entitiesIn("Tom Aspinall vacates UFC heavyweight title, Ciryl Gane set to be undisputed champion"), ["Tom Aspinall", "UFC", "Ciryl Gane"]);
  assert.deepEqual(entitiesIn("Why crossing 200 units makes your electricity bill jump"), []);
  assert.deepEqual(entitiesIn("After a 0-3 loss in England, Babar Azam returns to first-class cricket"), ["Babar Azam"]);
});

test("commons relevance: the museum is not the sport, the banknote is not the rupee story", () => {
  assert.equal(isRelevant("Washington Crossing the Delaware by Emanuel Leutze, MMA-NYC, 1851", "mixed martial arts octagon"), false);
  assert.equal(isRelevant("UFC octagon at a mixed martial arts event", "mixed martial arts octagon"), true);
  assert.equal(isRelevant("RBI 5-rupee note overprinted Government of Pakistan 1947", "Pakistani rupee banknotes"), false);
  assert.equal(isRelevant("Pakistani rupee banknotes on a table, Karachi", "Pakistani rupee banknotes"), true);
  assert.equal(isRelevant("A donkey cart in Sindh", "Babar Azam"), false);
  assert.equal(isRelevant("Babar Azam batting, 2023", "Babar Azam"), true);
});

test("srcSetFor leaves the master out of card srcsets", () => {
  const url = "https://img.searchable.pk/uploads/2026/09/0f8b6a9e-1e7f-4c8f-9d2e-7b2b9c9f1a11.webp";
  assert.match(srcSetFor(url, 1600, { maxWidth: 960 })!, /960w$/);
  assert.match(srcSetFor(url, 900, { maxWidth: 960 })!, / 900w$/);
});

test("relevance: generic words alone do not make a match", () => {
  assert.equal(isRelevant("A graveyard in Pakistan with a national monument", "National Savings Pakistan prize bond"), false);
  assert.equal(isRelevant("Prize bond counter at a National Savings centre, Pakistan", "National Savings Pakistan prize bond"), true);
  assert.equal(isRelevant("Lahore Fort at dusk", "Lahore Fort"), true);
  assert.equal(isRelevant("Lahore airport, view from the road", "traffic cars Lahore road"), false);
  assert.equal(isRelevant("Cars in traffic on Mall Road, Lahore", "traffic cars Lahore road"), true);
});

test("normalizePhone drops line ranges and rejects impossible lengths", () => {
  assert.equal(normalizePhone("042-35401620-6"), "+924235401620");
  assert.equal(normalizePhone("+92-42-35963421-30"), "+924235963421");
  assert.equal(normalizePhone("0300 1234567"), "+923001234567");
  assert.equal(normalizePhone("051-111-644-911"), "+9251111644911");
  assert.equal(normalizePhone("+9242354016206"), null);
  assert.equal(normalizePhone("+92-042-35459807"), "+924235459807");
  assert.equal(normalizePhone("45550"), null);
});

test("business slug does not repeat the city", () => {
  assert.equal(businessSlug("Mayo Hospital Lahore", "lahore"), "mayo-hospital-lahore");
  assert.equal(businessSlug("Mayo Hospital", "lahore"), "mayo-hospital-lahore");
});

test("formatPhone writes numbers the way people dial them", () => {
  assert.equal(formatPhone("+924235905000"), "042 35905000");
  assert.equal(formatPhone("+923001234567"), "0300 1234567");
  assert.equal(formatPhone("+9251111644911"), "051 111 644 911");
  assert.equal(formatPhone("+92616222952"), "061 6222952");
});

test("sun: Karachi's longest and shortest days match the almanac to two minutes", () => {
  const june = sunTimes(2026, 6, 21, 24.8607, 67.0011);
  const dec = sunTimes(2026, 12, 21, 24.8607, 67.0011);
  assert.equal(hhmm(june.sunrise), "05:43");
  assert.equal(hhmm(june.sunset), "19:24");
  assert.equal(hhmm(dec.sunrise), "07:12");
  assert.equal(hhmm(dec.sunset), "17:48");
  assert.equal(h12(june.sunset), "7:24 pm");
});

test("prayer times run in order and Hanafi Asr is later than Shafi", () => {
  const p = prayerTimes(2026, 9, 17, 31.5204, 74.3587);
  const shafi = prayerTimes(2026, 9, 17, 31.5204, 74.3587, { asr: "shafi" });
  assert.ok(p.fajr < p.sunrise && p.sunrise < p.dhuhr && p.dhuhr < p.asr && p.asr < p.maghrib && p.maghrib < p.isha);
  assert.ok(p.asr > shafi.asr);
  assert.equal(hhmm(p.maghrib), hhmm(sunTimes(2026, 9, 17, 31.5204, 74.3587).sunset + 1 / 60));
  assert.equal(currentPrayer(p, 13).next, "asr");
  assert.equal(currentPrayer(p, 23).next, "fajr");
});

test("hijri: the Umm al-Qura table gives a sane date and month name", () => {
  const h = umalquraDate(new Date("2026-09-17T06:00:00Z"));
  assert.ok(h.day >= 1 && h.day <= 30 && h.month >= 1 && h.month <= 12);
  assert.equal(h.year, 1448);
  assert.ok(h.monthName.length > 0 && h.monthUrdu.length > 0);
});

test("weather: symbols read as plain words and feels-like follows the heat index", () => {
  assert.equal(describeSymbol("partlycloudy_night"), "Partly cloudy");
  assert.equal(describeSymbol("heavyrainshowersandthunder_day"), "Heavy showers with thunder");
  assert.ok(feelsLike(38, 60, 10) > 44);
  assert.equal(feelsLike(20, 50, 10), 20);
});

test("prices: merge keeps history on a price move and adds new models", () => {
  const src = { title: "Vivo Pakistan price list", url: "https://www.vivo.com/pk" };
  const cur: PriceItemT[] = [{ slug: "vivo-y29", brand: "Vivo", model: "Y29", price: 44999, specs: { ram: "6 GB", storage: "128 GB", battery: "6500 mAh" }, source: src, history: [{ date: "2026-09-01", price: 44999 }] }];
  const r = mergePriceItems(cur, [{ ...cur[0], price: 42999, history: [] }, { slug: "vivo-v60", brand: "Vivo", model: "V60", price: 149999, specs: { ram: "12 GB", storage: "256 GB", battery: "6500 mAh" }, source: src, history: [] }], "2026-09-17");
  assert.equal(r.added, 1);
  assert.equal(r.updated, 1);
  assert.deepEqual(r.priceMoves, [{ slug: "vivo-y29", from: 44999, to: 42999 }]);
  const y29 = r.items.find((i) => i.slug === "vivo-y29")!;
  assert.equal(y29.history.length, 2);
  assert.equal(y29.history[1].price, 42999);
  assert.equal(r.items.find((i) => i.slug === "vivo-v60")!.history[0].date, "2026-09-17");
  assert.equal(brandSlug("Road Prince"), "road-prince");
  assert.deepEqual(priceRange({ ...y29, variants: [{ name: "8/256", price: 49999 }] }), { min: 42999, max: 49999 });
});

test("ramadan window: thirty consecutive days in month nine", () => {
  const w = ramadanWindow(new Date("2026-09-17T06:00:00Z"), 0)!;
  assert.ok(w.days.length >= 29 && w.days.length <= 30);
  assert.equal(w.days[0].n, 1);
  assert.ok(w.first.getTime() > Date.parse("2026-09-17"));
});

test("quakes: distance and magnitude words", () => {
  assert.ok(Math.abs(distanceKm(31.5204, 74.3587, 33.6844, 73.0479) - 270) < 15);
  assert.equal(describeMag(6.2), "Strong");
  assert.equal(describeMag(3.1), "Minor");
});
