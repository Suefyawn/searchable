"use client";

import * as React from "react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

const TOPICS = [
  { value: "pakistan", label: "Pakistan" },
  { value: "business", label: "Business" },
  { value: "technology", label: "Technology" },
  { value: "ai", label: "AI" },
  { value: "finance", label: "Finance" },
  { value: "cars", label: "Cars" },
  { value: "property", label: "Property" },
  { value: "jobs", label: "Jobs" },
];

export function NewsletterForm({ compact = false, source = "page", className }: { compact?: boolean; source?: string; className?: string }) {
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [topics, setTopics] = React.useState<string[]>(["pakistan", "business"]);
  const [frequency, setFrequency] = React.useState<"daily" | "weekly">("daily");
  const [state, setState] = React.useState<"idle" | "loading" | "pending" | "already_active" | "error">("idle");
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined, topics, frequency, source }),
      });
      const data = (await res.json()) as { status?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setState(data.status === "already_active" ? "already_active" : "pending");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (state === "pending") {
    return (
      <div className={cn("rounded-md border border-brand-200 bg-brand-50 px-4 py-3 text-[15px] dark:border-brand-800 dark:bg-brand-950/40", className)}>
        <p className="font-medium">Check your inbox</p>
        <p className="text-2">
          We sent a confirmation link to <strong>{email}</strong>. Click it and you are in.
        </p>
      </div>
    );
  }
  if (state === "already_active") {
    return (
      <div className={cn("rounded-md border border-line bg-surface-2 px-4 py-3 text-[15px]", className)}>
        <p className="font-medium">You are already subscribed.</p>
        <p className="text-2">Preferences updated.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-3", className)}>
      <div className={cn("flex gap-2", compact ? "" : "flex-col sm:flex-row")}>
        {!compact ? <Input type="text" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="sm:max-w-[200px]" /> : null}
        <Input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
        <Button type="submit" disabled={state === "loading"} className="shrink-0 h-11">
          {state === "loading" ? "Sending…" : "Subscribe"}
        </Button>
      </div>
      {!compact ? (
        <>
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((t) => {
              const on = topics.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTopics((cur) => (on ? cur.filter((x) => x !== t.value) : [...cur, t.value]))}
                  aria-pressed={on}
                  className={cn("rounded-full border px-3 py-1 text-sm transition-colors", on ? "border-brand-600 bg-brand-700 text-white" : "border-line bg-surface text-2 hover:bg-surface-2")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-sm text-2">
            {(["daily", "weekly"] as const).map((f) => (
              <label key={f} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="frequency" value={f} checked={frequency === f} onChange={() => setFrequency(f)} className="accent-brand-700" />
                {f === "daily" ? "Every morning" : "Weekly digest"}
              </label>
            ))}
          </div>
        </>
      ) : null}
      {state === "error" ? <p className="text-sm text-red-600">{error}</p> : null}
      <p className="text-xs text-3">No spam. Unsubscribe in one click.</p>
    </form>
  );
}
