import { notFound } from "next/navigation";
import { ArticleListing } from "@/components/article-page";
import { Breadcrumbs, SectionHeader } from "@/components/ui";
import { listArticlesByTag } from "@/db/queries/content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 600;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await listArticlesByTag(slug, 5);
  if (!data) return {};
  return buildMetadata({ title: `${data.tag.name}: news and guides`, description: `Everything tagged ${data.tag.name} on Searchable.`, path: `/tags/${slug}`, noindex: data.items.length < 3, kicker: "Tag" });
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  const data = await listArticlesByTag(slug);
  if (!data) notFound();
  return (
    <div className="container-x py-8 sm:py-12">
      <Breadcrumbs items={[{ name: "News", path: "/news" }, { name: data.tag.name, path: `/tags/${slug}` }]} className="mb-4" />
      <SectionHeader as="h1" eyebrow="Tag" title={data.tag.name} description={`${data.items.length} article${data.items.length === 1 ? "" : "s"}`} />
      <ArticleListing items={data.items} emptyText="Nothing tagged yet." />
    </div>
  );
}
