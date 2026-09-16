import { eq } from "drizzle-orm";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { PAGES } from "@/content/pages";
import { getDb, schema } from "@/db";
import { renderMarkdown } from "@/lib/markdown";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string[] }> };

/**
 * Catch-all for (a) static Markdown pages in src/content/pages.ts and (b) the `redirects` table.
 * Anything else is a real 404.
 */
export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ slug: [page] }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = slug.length === 1 ? PAGES[slug[0]] : undefined;
  if (!p) return {};
  return buildMetadata({ title: p.title, description: p.description, path: `/${slug[0]}` });
}

export default async function CatchAll({ params }: Props) {
  const { slug } = await params;
  const p = slug.length === 1 ? PAGES[slug[0]] : undefined;
  if (p) {
    return (
      <div className="container-x py-10 sm:py-14">
        <h1 className="font-display text-4xl sm:text-5xl">{p.title}</h1>
        <p className="mt-3 max-w-[68ch] text-lg text-2">{p.description}</p>
        <div className="prose prose-searchable mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
      </div>
    );
  }
  const path = "/" + slug.map(decodeURIComponent).join("/");
  const db = await getDb();
  const hit = await db.query.redirects.findFirst({ where: eq(schema.redirects.fromPath, path) });
  if (hit) (hit.statusCode === 301 || hit.statusCode === 308 ? permanentRedirect : redirect)(hit.toPath);
  notFound();
}
