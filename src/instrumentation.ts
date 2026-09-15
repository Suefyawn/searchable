import type { Instrumentation } from "next";

/**
 * Error monitoring without a vendor (docs/FREE-TIER.md): every uncaught server error, whether from a page,
 * a route handler, a server action or the proxy, is written to analytics_events as an "error" event with
 * its message, digest, route and the first lines of the stack. /admin/system lists the last day of them;
 * pruneOldRows() clears them with the rest of the events after 90 days. Fire-and-forget: a failing write
 * must never turn one error into two.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { getDb, schema } = await import("@/db");
    const e = err as Error & { digest?: string };
    const db = await getDb();
    await db.insert(schema.analyticsEvents).values({
      name: "error",
      path: request.path.slice(0, 300),
      props: {
        message: String(e?.message ?? err).slice(0, 500),
        digest: e?.digest ?? null,
        stack: String(e?.stack ?? "").split("\n").slice(1, 5).join("\n").slice(0, 800),
        method: request.method,
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
        renderSource: context.renderSource ?? null,
      },
    });
  } catch {
    // the database is the thing that failed, most likely; the platform log still has the original error
  }
};
