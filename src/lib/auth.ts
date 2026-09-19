import { timingSafeEqual } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { captcha } from "better-auth/plugins";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema, type Database } from "@/db";
import { atLeast, can, type Context, type Operation, type Resource } from "@jet/authz";
import { hashApiKey } from "@/lib/api-keys";
import { SITE } from "@/lib/utils";

export type Role = (typeof schema.userRole.enumValues)[number];

function buildAuth(db: Database) {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL?.trim() || SITE.url,
    secret: process.env.BETTER_AUTH_SECRET,
    // The Worker answers on its workers.dev host as well as the custom domain; better-auth rejects any origin
    // that is not baseURL or listed here ("Invalid origin"). localhost is for vinext dev.
    trustedOrigins: ["https://*.sooviaan.workers.dev", "http://localhost:3000"],
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    // Turnstile on sign-up and sign-in (ADR-47): the client sends the widget token as x-captcha-response.
    plugins: process.env.TURNSTILE_SECRET?.trim() ? [captcha({ provider: "cloudflare-turnstile", secretKey: process.env.TURNSTILE_SECRET.trim() })] : [],
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "user", input: false },
      },
    },
    // cookieCache: a signed cookie answers getSession for 5 minutes, so signed-in browsing does not hit the
    // database on every request (free-tier query budget).
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 300 } },
  });
}

export type Auth = ReturnType<typeof buildAuth>;
type Globals = typeof globalThis & { __searchableAuth?: Promise<Auth> };
const g = globalThis as Globals;

/** better-auth instance, built lazily because the database client is async (PGlite). */
export function getAuth(): Promise<Auth> {
  if (!g.__searchableAuth) g.__searchableAuth = getDb().then(buildAuth);
  return g.__searchableAuth;
}

export type SessionUser = { id: string; email: string; name: string; role: Role; image?: string | null };

/**
 * Admin API: a request carrying `Authorization: Bearer <key>` acts as an admin account, so every server action and
 * query guard works unchanged for automation (the scheduled content task, scripts, external tools). Two kinds of key
 * are honoured: the `ADMIN_API_KEY` environment variable (acts as the first admin) and keys made from
 * /admin/api-keys (act as the admin who made them, with the key's role). A key never creates a browser session.
 */
async function apiKeyUser(h: Headers): Promise<SessionUser | null> {
  return userForBearer(h.get("authorization")?.replace(/^Bearer\s+/i, "").trim());
}

/** The account a bearer key stands for, or null. Exported so the key path can be exercised without a request. */
export async function userForBearer(given: string | undefined): Promise<SessionUser | null> {
  if (!given || given.length < 32) return null;
  const db = await getDb();
  const envKey = process.env.ADMIN_API_KEY?.trim();
  if (envKey && envKey.length >= 32) {
    const a = Buffer.from(envKey);
    const b = Buffer.from(given);
    if (a.length === b.length && timingSafeEqual(a, b)) return actAs(db, null, "admin");
  }
  const row = await db.query.apiKeys.findFirst({ where: and(eq(schema.apiKeys.keyHash, await hashApiKey(given)), isNull(schema.apiKeys.revokedAt)) });
  if (!row) return null;
  // last_used_at is a coarse signal for the admin page; one write every five minutes per key at most.
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 5 * 60_000) await db.update(schema.apiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.apiKeys.id, row.id));
  // A key is only as strong as its maker still is: a demoted or deleted admin takes their keys down with them.
  const maker = row.createdBy ? await db.query.users.findFirst({ where: eq(schema.users.id, row.createdBy) }) : null;
  if (!maker || !atLeast(maker.role, row.role)) return null;
  return { id: maker.id, email: maker.email, name: maker.name, role: row.role, image: maker.image };
}

/** The environment key stands for the first admin account. */
async function actAs(db: Database, _userId: null, role: Role): Promise<SessionUser | null> {
  const user = await db.query.users.findFirst({ where: eq(schema.users.role, "admin"), orderBy: [asc(schema.users.createdAt)] });
  return user ? { id: user.id, email: user.email, name: user.name, role, image: user.image } : null;
}

/** True when some key can authenticate the admin API at all (env key or an unrevoked row). */
export async function adminApiConfigured(): Promise<boolean> {
  if (process.env.ADMIN_API_KEY) return true;
  const db = await getDb();
  return !!(await db.query.apiKeys.findFirst({ where: isNull(schema.apiKeys.revokedAt), columns: { id: true } }));
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const h = await headers();
  const viaKey = await apiKeyUser(h);
  if (viaKey) return viaKey;
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: h });
  if (!session?.user) return null;
  const u = session.user as typeof session.user & { role?: string };
  return { id: u.id, email: u.email, name: u.name, role: (u.role as Role) ?? "user", image: u.image };
}

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** The role ladder (user, business_owner, editor, admin), answered by the policy package so it has one home. */
export function hasRole(user: SessionUser | null, role: Role): boolean {
  return !!user && atLeast(user.role, role);
}

/**
 * The policy question for one action (packages/authz, ADR-47): may this session do `op` on `resource`? Pass
 * `own: true` when the caller has established that the thing belongs to the user.
 */
export function allowed(user: SessionUser | null, op: Operation, resource: Resource, ctx?: Context): boolean {
  return can(user?.role ?? "anonymous", op, resource, ctx);
}

export async function requireRole(role: Role, next = "/admin"): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!hasRole(user, role)) redirect("/?denied=1");
  return user;
}
