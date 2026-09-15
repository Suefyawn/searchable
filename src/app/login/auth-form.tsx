"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button, Field, Input } from "@/components/ui";
import { signIn, signUp } from "@/lib/auth-client";
import { setAuthHint } from "@/lib/auth-hint";

export function AuthForm({ next, initialMode }: { next: string; initialMode: "login" | "register" }) {
  const router = useRouter();
  const [mode, setMode] = React.useState(initialMode);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "");
    const res =
      mode === "register"
        ? await signUp.email({ email, password, name, callbackURL: next })
        : await signIn.email({ email, password, callbackURL: next });
    setLoading(false);
    if (res.error) {
      setError(res.error.message ?? "Something went wrong");
      return;
    }
    setAuthHint();
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "register" ? (
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
        </Field>
      ) : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Password" htmlFor="password" help={mode === "register" ? "At least 8 characters." : undefined}>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "register" ? "new-password" : "current-password"} />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-2">
        {mode === "register" ? "Already have an account?" : "New to Searchable?"}{" "}
        <button type="button" onClick={() => setMode(mode === "register" ? "login" : "register")} className="font-medium text-brand-700 dark:text-brand-300">
          {mode === "register" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
