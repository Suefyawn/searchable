import type { Instrumentation } from "next";

/**
 * Error monitoring without a vendor (ADR-48): every uncaught server error, whether from a page, a route handler,
 * a server action or the proxy, is fingerprinted and counted in error_fingerprints by recordError(), which
 * mails the first occurrence. /admin/system lists them. Fire-and-forget by construction.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // Next compiles this file for its edge runtime too; that copy must not pull the database driver in (the
  // constant is inlined at build time, so everything below is dropped from the edge bundle). Node and Workers run it.
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { recordError } = await import("@/lib/errors");
  const e = err as Error & { digest?: string };
  await recordError("server", context.routePath || request.path, err, {
    path: request.path.slice(0, 300),
    method: request.method,
    digest: e?.digest ?? null,
    routerKind: context.routerKind,
    routeType: context.routeType,
    renderSource: context.renderSource ?? null,
  });
};
