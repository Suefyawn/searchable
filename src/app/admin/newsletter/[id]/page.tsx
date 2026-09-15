import { and, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { hasRole, requireRole } from "@/lib/auth";
import { renderIssueHtml } from "@/lib/newsletter-issue";
import { SITE } from "@/lib/utils";
import { IssueEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function IssuePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("editor");
  const { id } = await params;
  const db = await getDb();
  const issue = await db.query.newsletterIssues.findFirst({ where: eq(schema.newsletterIssues.id, id) });
  if (!issue) notFound();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.newsletterSubscribers)
    .where(and(eq(schema.newsletterSubscribers.status, "active"), eq(schema.newsletterSubscribers.frequency, issue.frequency)));
  const previewHtml = renderIssueHtml(issue, { unsubscribeUrl: `${SITE.url}/newsletter/unsubscribe?token=preview`, manageUrl: `${SITE.url}/newsletter/manage?token=preview` });

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link href="/admin/newsletter" className="text-2 underline-offset-4 hover:underline">← Searchable Daily</Link>
      </p>
      <h1 className="mb-6 text-2xl font-semibold">{issue.subject}</h1>
      <IssueEditor issue={{ ...issue, frequency: issue.frequency as "daily" | "weekly" }} previewHtml={previewHtml} userEmail={user.email} isAdmin={hasRole(user, "admin")} activeCount={n} />
    </div>
  );
}
