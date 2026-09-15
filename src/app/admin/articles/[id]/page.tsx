import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { listEntities } from "@/db/queries/entities";
import { listCities } from "@/db/queries/geo";
import { formatDate } from "@/lib/format";
import { ArticleEditor } from "../editor";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const a = await db.query.articles.findFirst({ where: eq(schema.articles.id, id), with: { category: true, revisions: { orderBy: (r, { desc }) => [desc(r.createdAt)], limit: 5 } } });
  if (!a) notFound();
  const [categories, cities, entities, links] = await Promise.all([
    db.query.categories.findMany(),
    listCities(),
    listEntities(200),
    db.select({ slug: schema.entities.slug }).from(schema.entityLinks).innerJoin(schema.entities, eq(schema.entityLinks.entityId, schema.entities.id)).where(and(eq(schema.entityLinks.targetType, "article"), eq(schema.entityLinks.targetId, id))),
  ]);
  const url = `/${a.kind === "news" ? "news" : "guides"}/${a.category?.slug ?? "general"}/${a.slug}`;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Edit article</h1>
        <div className="flex items-center gap-3 text-sm">
          {a.status === "published" ? (
            <Link href={url} target="_blank" className="font-medium text-brand-700 dark:text-brand-300">
              View live ↗
            </Link>
          ) : null}
          <Link href="/admin/articles" className="text-2">
            ← All articles
          </Link>
        </div>
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
          locationId: a.locationId ?? undefined,
          featuredImageUrl: a.featuredImageUrl ?? undefined,
          seoTitle: a.seoTitle ?? undefined,
          seoDescription: a.seoDescription ?? undefined,
          isFeatured: a.isFeatured,
          noindex: a.noindex,
          sources: a.sources,
          faqs: a.faqs,
          entitySlugs: links.map((l) => l.slug),
          status: a.status,
        }}
        categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        entities={entities.map((e) => ({ slug: e.slug, name: e.name }))}
      />
      {a.revisions.length ? (
        <section className="mt-10 max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-3">Revisions</h2>
          <ul className="mt-2 divide-y divide-[var(--border)] surface px-4 text-sm">
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
