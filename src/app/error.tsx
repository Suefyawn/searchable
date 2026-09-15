"use client";

import * as React from "react";
import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // A crash in the browser is reported once so /admin/system sees it; server errors are recorded by
  // src/instrumentation.ts and carry the same digest.
  React.useEffect(() => {
    const body = JSON.stringify({ name: "error", path: location.pathname.slice(0, 300), props: { message: String(error?.message ?? error).slice(0, 500), digest: error?.digest ?? "", source: "client" } });
    try {
      if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
    } catch {
      // nothing to do: reporting must never throw inside the error page
    }
  }, [error]);
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-2">We have logged it. Try again, or come back in a moment.</p>
      {error.digest ? <p className="mt-2 text-xs text-3">Ref: {error.digest}</p> : null}
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
