import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { apiKeyPrefix, generateApiKey, hashApiKey } from "../src/lib/api-keys";
import { backlogScore } from "../src/lib/backlog";
import { normalizePhone } from "../src/lib/dedupe";
import { businessSlug } from "../src/lib/import";
import { inviteToken, readInviteToken } from "../src/lib/claims";
import { formatPhone, formatReading, pkr } from "../src/lib/format";
import { srcSetFor } from "../src/lib/images";
import { webpDimensions } from "../src/lib/webp";
import { entitiesIn, isRelevant } from "../src/lib/open-images";
import { parseAddress, verifyResendWebhook } from "../src/lib/inbox";
import { renderMarkdown, renderUserMarkdown } from "../src/lib/markdown";
import { slugify, uniqueSlug } from "../src/lib/slug";
import { ramadanWindow, umalquraDate } from "../src/lib/today/hijri";
import { brandSlug, mergePriceItems, priceRange, type PriceItemT } from "../src/lib/prices-shared";
import { describeMag, distanceKm } from "../src/lib/today/quakes";
import { currentPrayer, prayerTimes } from "../src/lib/today/prayer";
import { h12, hhmm, sunTimes } from "../src/lib/today/sun";
import { describeSymbol, feelsLike } from "../src/lib/today/weather";
import { CURRENT_TAX_YEAR, computeIncomeTax, getTaxYear } from "../src/tools/data/income-tax";
import { wht236K } from "../src/tools/data/property-tax";
import { ZAKAT } from "../src/tools/data/rates";
import { TOOL_CATEGORIES, TOOLS } from "../src/tools/registry";

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

test("member markdown: raw HTML is shown as text, script links are neutralised", () => {
  const html = renderUserMarkdown("Hi <img src=x onerror=alert(1)>\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1)) [y](java\tscript:alert(1)) [z](https://example.com/?a=1&b=2)");
  assert.ok(!html.includes("<img"), "inline html must be escaped");
  assert.ok(!html.includes("<script"), "block html must be escaped");
  assert.ok(!/javascript:/i.test(html), "script links must not survive");
  assert.ok(html.includes('href="https://example.com/?a=1&amp;b=2"'), "ordinary links keep working, attributes escaped");
  // Editor markdown keeps raw HTML (cite blocks, embeds) but still refuses script links.
  const trusted = renderMarkdown("<div class=\"cite\">ok</div>\n\n[x](javascript:alert(1))");
  assert.ok(trusted.includes('<div class="cite">'));
  assert.ok(!/javascript:/i.test(trusted));
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
  const roots = ["src", "scripts", "docs"];
  const offenders: string[] = [];
  for (const f of ["README.md", "CLAUDE.md", "SEARCHABLE_MASTER_SPEC.md"]) if (readFileSync(f, "utf8").includes("—")) offenders.push(f);
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

test("formatReading carries the unit", () => {
  assert.equal(formatReading(384.34, "PKR per litre"), "Rs 384.34/litre");
  assert.equal(formatReading(451664, "PKR"), "Rs 451,664");
  assert.equal(formatReading(76911, "USD"), "$76,911");
  assert.equal(formatReading(11.5, "%"), "11.5%");
  assert.equal(formatReading(169579.52, "points"), "169,579.52 pts");
});

/* ───────────── Money paths: the product is the number ───────────── */

test("income tax 2026-27: tax is continuous at every slab boundary and the next rupee is taxed at the next rate", () => {
  for (const kind of ["salaried", "nonSalaried"] as const) {
    const slabs = CURRENT_TAX_YEAR[kind];
    for (let i = 0; i < slabs.length - 1; i++) {
      const edge = slabs[i].upTo!;
      const at = computeIncomeTax(edge, CURRENT_TAX_YEAR, kind);
      assert.equal(at.baseTax, slabs[i + 1].fixed, `${kind}: tax at ${edge} must equal the next slab's fixed amount`);
      const above = computeIncomeTax(edge + 1, CURRENT_TAX_YEAR, kind);
      assert.equal(above.marginalRate, slabs[i + 1].rate, `${kind}: one rupee over ${edge} is in the next slab`);
      assert.ok(above.baseTax - at.baseTax <= 1 + slabs[i + 1].rate, `${kind}: one rupee over ${edge} adds at most one rupee of tax`);
    }
  }
  // Worked example, FY 2026-27 salaried: Rs 250,000 a month = Rs 3,000,000 a year → 116,000 + 20% of 800,000.
  assert.equal(computeIncomeTax(3_000_000, CURRENT_TAX_YEAR, "salaried").totalTax, 276_000);
  assert.equal(computeIncomeTax(599_999, CURRENT_TAX_YEAR, "salaried").totalTax, 0);
  assert.equal(computeIncomeTax(-5, CURRENT_TAX_YEAR, "salaried").totalTax, 0);
});

test("income tax surcharge: withdrawn for salaried from 2026-27, 9% in 2025-26, 10% for business income in both", () => {
  const income = 10_000_001;
  const y27 = getTaxYear("2026-27");
  const y26 = getTaxYear("2025-26");
  assert.equal(computeIncomeTax(income, y27, "salaried").surcharge, 0);
  const s26 = computeIncomeTax(income, y26, "salaried");
  assert.equal(s26.surcharge, Math.round(s26.baseTax * 0.09));
  for (const y of [y27, y26]) {
    const b = computeIncomeTax(income, y, "nonSalaried");
    assert.equal(b.surcharge, Math.round(b.baseTax * 0.1));
    assert.equal(computeIncomeTax(10_000_000, y, "nonSalaried").surcharge, 0, "surcharge starts above the threshold, not at it");
  }
});

test("sales tax: inclusive amounts back out the tax, further tax only on goods", () => {
  const tool = TOOLS.find((t) => t.slug === "sales-tax-calculator")!;
  const inclusive = tool.compute({ amount: 118_000, kind: "goods", mode: "inclusive", unregistered: false });
  assert.equal(inclusive.headline.value, pkr(18_000));
  assert.ok(inclusive.summary?.includes(pkr(100_000)));
  const unregistered = tool.compute({ amount: 100_000, kind: "goods", mode: "exclusive", unregistered: true });
  assert.equal(unregistered.headline.value, pkr(22_000));
  const sindh = tool.compute({ amount: 100_000, kind: "sindh", mode: "exclusive", unregistered: true });
  assert.equal(sindh.headline.value, pkr(15_000), "services carry no further tax");
});

test("property 236K bands: filer flat, non-filer steps at Rs 50M and Rs 100M", () => {
  assert.equal(wht236K(1, true), 0.0125);
  assert.equal(wht236K(500_000_000, true), 0.0125);
  assert.equal(wht236K(50_000_000, false), 0.105);
  assert.equal(wht236K(50_000_001, false), 0.145);
  assert.equal(wht236K(100_000_000, false), 0.145);
  assert.equal(wht236K(100_000_001, false), 0.185);
});

test("zakat: due at the nisab, not one rupee below; the gold basis moves the threshold", () => {
  const tool = TOOLS.find((t) => t.slug === "zakat-calculator")!;
  const silverPrice = 500;
  const goldPrice = 30_000;
  const silverNisab = ZAKAT.nisabSilverGrams * silverPrice;
  const base = { goldGrams: 0, silverGrams: 0, investments: 0, receivables: 0, debts: 0, goldPrice, silverPrice };
  assert.equal(tool.compute({ ...base, cash: silverNisab, nisabBasis: "silver" }).headline.value, pkr(silverNisab * ZAKAT.rate));
  assert.equal(tool.compute({ ...base, cash: silverNisab - 1, nisabBasis: "silver" }).headline.value, pkr(0));
  const goldNisab = ZAKAT.nisabGoldGrams * goldPrice;
  assert.equal(tool.compute({ ...base, cash: silverNisab, nisabBasis: "gold" }).headline.value, pkr(0), "above silver nisab but below gold nisab");
  assert.equal(tool.compute({ ...base, cash: goldNisab, nisabBasis: "gold" }).headline.value, pkr(goldNisab * ZAKAT.rate));
  assert.equal(tool.compute({ ...base, cash: silverNisab + 100_000, debts: 100_001, nisabBasis: "silver" }).headline.value, pkr(0), "debts come off first");
});

test("gratuity: six months round up, under a year is not due", () => {
  const tool = TOOLS.find((t) => t.slug === "gratuity-calculator")!;
  assert.equal(tool.compute({ wage: 60_000, years: 5, months: 6 }).headline.value, pkr(360_000));
  assert.equal(tool.compute({ wage: 60_000, years: 5, months: 5 }).headline.value, pkr(300_000));
  assert.equal(tool.compute({ wage: 60_000, years: 1, months: 0 }).headline.value, pkr(60_000));
  assert.equal(tool.compute({ wage: 60_000, years: 0, months: 11 }).headline.value, "Not yet due");
});

/* ───────────── Identity and links ───────────── */

test("uniqueSlug appends -2, -3 until the slug is free", async () => {
  const taken = new Set(["lahore", "lahore-2"]);
  assert.equal(await uniqueSlug("lahore", async (s) => taken.has(s)), "lahore-3");
  assert.equal(await uniqueSlug("karachi", async (s) => taken.has(s)), "karachi");
});

test("claim invite tokens: round-trip, tampered signature and expiry are refused", () => {
  const token = inviteToken("biz_1", "Owner@Example.com");
  assert.deepEqual(readInviteToken(token), { businessId: "biz_1", email: "owner@example.com" });
  assert.equal(readInviteToken(token.slice(0, -2) + "xx"), null, "tampered signature");
  assert.equal(readInviteToken("a.b.c"), null, "wrong shape");
  const [id, , emailB64] = token.split(".");
  const expired = `${id}.${Date.now() - 1000}.${emailB64}`;
  const sig = createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "dev-secret").update(expired).digest("base64url");
  assert.equal(readInviteToken(`${expired}.${sig}`), null, "expired token with a valid signature");
});

test("registry integrity: unique slugs, known categories, https sources", () => {
  const slugs = new Set<string>();
  for (const t of TOOLS) {
    assert.ok(!slugs.has(t.slug), `duplicate slug ${t.slug}`);
    slugs.add(t.slug);
    assert.ok(t.category in TOOL_CATEGORIES, `${t.slug}: unknown category ${t.category}`);
    for (const s of t.sources) assert.ok(!s.url || s.url.startsWith("https://"), `${t.slug}: source "${s.title}" is not https`);
    for (const r of t.related?.tools ?? []) assert.ok(TOOLS.some((o) => o.slug === r), `${t.slug}: related tool ${r} does not exist`);
  }
});

test("admin API keys: 256-bit hex with a recognisable prefix, hashed deterministically, shown by prefix only", async () => {
  const key = generateApiKey();
  assert.match(key, /^spk_[0-9a-f]{64}$/);
  assert.notEqual(key, generateApiKey());
  assert.equal(await hashApiKey(key), await hashApiKey(key));
  assert.match(await hashApiKey(key), /^[0-9a-f]{64}$/);
  assert.notEqual(await hashApiKey(key), await hashApiKey(key + "x"));
  assert.equal(apiKeyPrefix(key), key.slice(0, 12));
  assert.ok(!(await hashApiKey(key)).includes(key.slice(4, 20)));
});

test("webp header parser reads the size of every stored rendition without decoding, and rejects non-WebP bytes", () => {
  const dir = "public/uploads/2026/09";
  const files = readdirSync(dir).filter((f) => f.endsWith(".webp")).slice(0, 12);
  assert.ok(files.length >= 3, "sample uploads present");
  for (const f of files) {
    const dims = webpDimensions(new Uint8Array(readFileSync(path.join(dir, f))));
    assert.ok(dims && dims.width > 0 && dims.height > 0, f);
    const m = f.match(/-(480|960).webp$/);
    if (m) assert.equal(dims!.width, Number(m[1]), f);
  }
  assert.equal(webpDimensions(new Uint8Array(readFileSync("public/og-card.png"))), null);
  assert.equal(webpDimensions(new Uint8Array(8)), null);
  // Lossless (VP8L) header, 1 x 1: signature 2f then 14-bit width-1 and height-1 packed little-endian.
  const vp8l = new Uint8Array([...Buffer.from("RIFF"), 0x1a, 0, 0, 0, ...Buffer.from("WEBPVP8L"), 0x0e, 0, 0, 0, 0x2f, 0x00, 0x00, 0x00, 0x00, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe, 0x07, 0x00]);
  assert.deepEqual(webpDimensions(vp8l), { width: 1, height: 1 });
});
