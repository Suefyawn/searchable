import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { getBusiness } from "@/db/queries/directory";
import { requireUser } from "@/lib/auth";
import { Button, Textarea } from "@/components/ui";

export const metadata = { title: "Claim this business", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/claim/${slug}`);
  const b = await getBusiness(slug);
  if (!b) notFound();
  const db = await getDb();
  const existing = await db.query.businessClaims.findFirst({ where: and(eq(schema.businessClaims.businessId, b.id), eq(schema.businessClaims.userId, user.id)) });

  async function claim(formData: FormData) {
    "use server";
    const db = await getDb();
    const message = String(formData.get("message") ?? "").slice(0, 1000);
    await db.insert(schema.businessClaims).values({ businessId: b!.id, userId: user.id, message }).onConflictDoNothing();
    redirect(`/claim/${slug}?sent=1`);
  }

  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold">Claim {b.name}</h1>
        <p className="mt-2 text-2">
          Claiming lets you edit details, add photos and services, and respond to reviews. We verify claims by calling the listed number or checking a document.
        </p>
        <div className="mt-6 surface p-6">
          {existing ? (
            <div>
              <p className="font-medium">Claim {existing.status}</p>
              <p className="mt-1 text-[15px] text-2">
                {existing.status === "pending" ? "We will contact you to verify ownership within two working days." : existing.status === "approved" ? "You manage this listing." : "This claim was not approved. Contact us if you believe that is a mistake."}
              </p>
              <Link href={`/b/${b.slug}`} className="mt-4 inline-block text-sm font-medium text-brand-700 dark:text-brand-300">
                ← Back to listing
              </Link>
            </div>
          ) : (
            <form action={claim} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">How are you connected to this business?</span>
                <Textarea name="message" required minLength={10} maxLength={1000} placeholder="Owner / manager, and the best number to reach you on." />
              </label>
              <Button type="submit">Submit claim</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
