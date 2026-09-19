import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/*
 * CI guard (ADR-47): every "use server" file and every route handler under src/app/api must go through
 * src/lib/auth (requireUser, requireRole, getSessionUser, allowed, withAdminApi which does) or be listed here
 * as deliberately public. A new endpoint that forgets to authorise fails the build instead of shipping.
 */
const PUBLIC_ROUTES = new Set([
  "src/app/api/auth/[...all]/route.ts", // better-auth's own handler
  "src/app/api/search/route.ts",
  "src/app/api/suggest/route.ts",
  "src/app/api/feed/route.ts",
  "src/app/api/health/route.ts",
  "src/app/api/data/[slug]/route.ts",
  "src/app/api/md/[...path]/route.ts",
  "src/app/api/tools/[slug]/route.ts",
  "src/app/api/tools/[slug]/run/route.ts",
  "src/app/api/track/route.ts",
  "src/app/api/newsletter/subscribe/route.ts",
  "src/app/api/webhooks/resend/route.ts", // HMAC signature instead of a session
  "src/app/api/cron/ingest/route.ts", // CRON_SECRET (cronAuthorized)
  "src/app/api/cron/publish/route.ts",
  "src/app/b/[slug]/actions.ts", // public enquiry form, rate limited
  "src/app/contact/actions.ts", // public contact form, rate limited
  "src/app/newsletter/manage/page.tsx", // keyed by the subscriber's unsubscribe token
]);
const AUTH = /from "@\/lib\/auth"|from "\.\.?\/(\.\.\/)*lib\/auth"|withAdminApi|cronAuthorized|verifyResendWebhook/;

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p.replace(/\\/g, "/"));
  }
  return out;
}

const files = walk("src");
const problems: string[] = [];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const isAction = /^\s*"use server";?\s*$/m.test(src) || /"use server"/.test(src.split("\n").slice(0, 3).join("\n"));
  const isRoute = /^src\/app\/api\/.*\/route\.tsx?$/.test(f);
  if (!isAction && !isRoute) continue;
  if (PUBLIC_ROUTES.has(f)) continue;
  if (AUTH.test(src)) continue;
  problems.push(f);
}
if (problems.length) {
  console.error("These files export server actions or API routes without going through src/lib/auth (or being listed as public in scripts/check-authz.ts):");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`authz guard: ${files.length} files scanned, every action and route authorises or is listed public`);
