import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema, type Database } from "@/db";
import { SITE } from "@/lib/utils";

export type Role = (typeof schema.userRole.enumValues)[number];
const ROLE_RANK: Record<Role, number> = { user: 0, business_owner: 1, editor: 2, admin: 3 };

function buildAuth(db: Database) {
  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL?.trim() || SITE.url,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: schema.users, session: schema.sessions, account: schema.accounts, verification: schema.verifications },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
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

export async function getSessionUser(): Promise<SessionUser | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const u = session.user as typeof session.user & { role?: string };
  return { id: u.id, email: u.email, name: u.name, role: (u.role as Role) ?? "user", image: u.image };
}

export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export function hasRole(user: SessionUser | null, role: Role): boolean {
  return !!user && ROLE_RANK[user.role] >= ROLE_RANK[role];
}

export async function requireRole(role: Role, next = "/admin"): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!hasRole(user, role)) redirect("/?denied=1");
  return user;
}
