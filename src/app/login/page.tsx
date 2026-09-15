import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export const metadata = { title: "Sign in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const { next, mode } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(next && next.startsWith("/") ? next : "/account");
  return (
    <div className="container-x py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold">{mode === "register" ? "Create your account" : "Sign in"}</h1>
        <p className="mt-1 text-[15px] text-2">Save tools and guides, follow topics, claim your business.</p>
        <div className="mt-6 surface p-6">
          <AuthForm next={next && next.startsWith("/") ? next : "/account"} initialMode={mode === "register" ? "register" : "login"} />
        </div>
      </div>
    </div>
  );
}
