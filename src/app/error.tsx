"use client";

import { Button } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
