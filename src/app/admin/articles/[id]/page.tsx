import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { ArticleEditor } from "../editor";
import { editorOptions } from "../_data";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const a = await db.query.articles.findFirst({ where: eq(schema.articles.id, id), with: { category: true, revisions: { orderBy: (r, { desc }) => [desc(r.createdAt)], limit: 5 }, tags: { with: { tag: true } } } });
  if (!a) notFound();
  const [opts, links] = await Promise.all([
    editorOptions(),
    db.select({ slug: schema.entities.slug }).from(schema.entityLinks).innerJoin(schema.entities, eq(schema.entityLinks.entityId, schema.entities.id)).where(and(eq(schema.entityLinks.targetType, "article"), eq(schema.entityLinks.targetId, id))),
  ]);
  const url = `/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}`;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Edit article</h1>
        <Link href="/admin/articles" className="text-sm text-2">
          ← All articles
        </Link>
      </div>
      <ArticleEditor
        initial={{
          id: a.id,
          kind: a.kind,
          title: a.title,
          slug: a.slug,
          dek: a.dek ?? undefined,
          body: a.body,
          categoryId: a.categoryId ?? undefined,
          authorId: a.authorId ?? undefined,
          locationId: a.locationId ?? undefined,
          featuredImageUrl: a.featuredImageUrl ?? undefined,
          featuredImageAlt: a.featuredImageAlt ?? undefined,
          featuredImageCredit: a.featuredImageCredit ?? undefined,
          featuredImageSourceUrl: a.featuredImageSourceUrl ?? undefined,
          seoTitle: a.seoTitle ?? undefined,
          seoDescription: a.seoDescription ?? undefined,
          canonicalUrl: a.canonicalUrl ?? undefined,
          isFeatured: a.isFeatured,
          noindex: a.noindex,
          isSponsored: a.isSponsored,
          contributorName: a.contributorName ?? undefined,
          contributorBio: a.contributorBio ?? undefined,
          sources: a.sources,
          faqs: a.faqs,
          relatedIds: a.relatedIds,
          tags: a.tags.map((t) => t.tag.name),
          entitySlugs: links.map((l) => l.slug),
          status: a.status,
          scheduledFor: a.scheduledFor?.toISOString() ?? undefined,
          previewUrl: `/admin/articles/${a.id}/preview`,
          liveUrl: url,
        }}
        {...opts}
      />
      {a.revisions.length ? (
        <section className="mt-10 max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-3">Revisions</h2>
          <ul className="mt-2 divide-y divide-[var(--border)] border-y border-line text-sm">
            {a.revisions.map((r) => (
              <li key={r.id} className="flex justify-between py-2">
                <span>{r.note ?? "Published"}</span>
                <span className="text-3">{formatDate(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
