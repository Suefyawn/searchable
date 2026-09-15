import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/components/article-page";
import { getDb, schema } from "@/db";

export const metadata = { title: "Preview", robots: { index: false } };

/** Renders an article exactly as it will appear, regardless of status. Editors only (admin layout guards). */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const a = await db.query.articles.findFirst({ where: eq(schema.articles.id, id), with: { category: true, author: true, location: true } });
  if (!a) notFound();
  return (
    <div className="-mx-5 lg:-mx-8">
      <div className="mb-4 flex items-center justify-between border-y border-amber-300 bg-amber-50 px-5 py-2 text-sm dark:bg-amber-950/30">
        <span>
          Preview · status <strong>{a.status}</strong> — this is how the page will look when published.
        </span>
        <Link href={`/admin/articles/${a.id}`} className="font-medium underline underline-offset-4">
          Back to editor
        </Link>
      </div>
      <ArticlePage article={a} kind={a.kind === "news" ? "news" : "guide"} />
    </div>
  );
}
