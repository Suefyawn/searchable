import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDb, schema } from "@/db";
import { adminApiConfigured, allowed, getSessionUser, type SessionUser } from "./auth";
import { NoServerResize } from "./storage";

/**
 * Admin API plumbing (docs/ADMIN-API.md). Every route is `withAdminApi(async (req, ctx) => ...)`: the bearer
 * key is checked through getSessionUser (so the handler runs as the admin account and can call the same server
 * actions the dashboard uses), JSON bodies are parsed, Zod and thrown errors become JSON errors, and every
 * write is logged as an analytics event so /admin/system can show what the automation did.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: Request, ctx: { user: SessionUser; params: P; body: unknown }) => Promise<unknown>;

export function withAdminApi<P = Record<string, string>>(handler: Handler<P>) {
  return async (req: Request, ctx?: Ctx<P>) => {
    const started = Date.now();
    let status = 200;
    try {
      const user = await getSessionUser();
      // The admin API is the desk's: every route needs the editor role the matrix grants "jobs.update" to.
      if (!user || !allowed(user, "update", "jobs")) {
        if (!(await adminApiConfigured())) throw new ApiError(503, "No admin API key is configured");
        throw new ApiError(401, "Bearer key missing or wrong");
      }
      const params = ctx ? await ctx.params : ({} as P);
      const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
      const data = await handler(req, { user, params, body });
      return NextResponse.json(data ?? { ok: true }, { status });
    } catch (e) {
      const err = toError(e);
      status = err.status;
      return NextResponse.json({ error: err.message, ...(err.issues ? { issues: err.issues } : {}) }, { status });
    } finally {
      if (req.method !== "GET" && req.method !== "HEAD") void logCall(req, status, Date.now() - started);
    }
  };
}

/** JSON everywhere except uploads, which arrive as multipart/form-data and are handed over as FormData. */
async function readBody(req: Request): Promise<unknown> {
  if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) return req.formData();
  const text = await req.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Body must be JSON");
  }
}

function toError(e: unknown): { status: number; message: string; issues?: string[] } {
  if (e instanceof ApiError) return { status: e.status, message: e.message };
  if (e instanceof ZodError) return { status: 400, message: "Invalid input", issues: e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`) };
  // Asked a CPU-capped server to resize: the caller must prepare the renditions (POST /media multipart, ADR-43).
  if (e instanceof NoServerResize) return { status: 400, message: e.message };
  const msg = (e as Error)?.message ?? "Unknown error";
  // Server actions redirect on auth failure; in an API that is a permission error, not a page change.
  if (/NEXT_REDIRECT/.test(msg)) return { status: 403, message: "Not allowed for this account" };
  return { status: 500, message: msg };
}

async function logCall(req: Request, status: number, ms: number) {
  try {
    const db = await getDb();
    const path = new URL(req.url).pathname;
    await db.insert(schema.analyticsEvents).values({ name: "admin_api", path, props: { method: req.method, status, ms } });
  } catch {
    // Logging never fails a request.
  }
}

/** Query-string helpers. */
export function qs(req: Request) {
  const u = new URL(req.url);
  return {
    str: (k: string, d?: string) => u.searchParams.get(k)?.trim() || d,
    int: (k: string, d: number, max = 500) => Math.min(max, Math.max(1, Number(u.searchParams.get(k) ?? d) || d)),
  };
}

/** Resolve the slugs the automation speaks in (category, city, series) to ids, with clear errors. */
export async function resolveCategoryId(kind: "news" | "guide", slug?: string | null) {
  if (!slug) return undefined;
  const db = await getDb();
  const c = await db.query.categories.findFirst({ where: eq(schema.categories.slug, slug), columns: { id: true, kind: true } });
  if (!c) throw new ApiError(400, `Unknown ${kind} category "${slug}"; see GET /api/admin/reference`);
  if (c.kind !== kind) throw new ApiError(400, `Category "${slug}" is a ${c.kind} category, not ${kind}`);
  return c.id;
}

export async function resolveCityId(slug?: string | null) {
  if (!slug) return undefined;
  const db = await getDb();
  const c = await db.query.locations.findFirst({ where: eq(schema.locations.slug, slug), columns: { id: true, kind: true } });
  if (!c) throw new ApiError(400, `Unknown location "${slug}"; see GET /api/admin/reference`);
  return c.id;
}

export async function resolveSeriesId(slug: string) {
  const db = await getDb();
  const s = await db.query.dataSeries.findFirst({ where: eq(schema.dataSeries.slug, slug), columns: { id: true, unit: true, name: true } });
  if (!s) throw new ApiError(400, `Unknown data series "${slug}"; see GET /api/admin/reference`);
  return s;
}

/** FormData shim for the dashboard actions that still take a form. */
export function form(fields: Record<string, string | undefined | null>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) fd.set(k, v);
  return fd;
}
