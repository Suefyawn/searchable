import { notFound } from "next/navigation";
import { ArticleListing } from "@/components/article-page";
import { Img } from "@/components/img";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { listArticlesByAuthor } from "@/db/queries/content";
import { buildMetadata, personJsonLd } from "@/lib/seo";

export const revalidate = 600;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = await listArticlesByAuthor(slug, 1);
  if (!data) return {};
  return buildMetadata({ title: data.author.name, description: data.author.bio ?? `Articles and guides by ${data.author.name} on Searchable.`, path: `/authors/${slug}`, image: data.author.avatarUrl, kicker: "Author" });
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const data = await listArticlesByAuthor(slug);
  if (!data) notFound();
  const { author, items } = data;
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={personJsonLd({ name: author.name, slug, bio: author.bio })} />
      <Breadcrumbs items={[{ name: "News", path: "/news" }, { name: author.name, path: `/authors/${slug}` }]} className="mb-4" />
      <div className="flex items-start gap-5">
        {author.avatarUrl ? <Img src={author.avatarUrl} alt={author.name} aspect="1/1" className="size-20 shrink-0" sizes="80px" /> : null}
        <SectionHeader as="h1" eyebrow="Author" title={author.name} description={author.bio ?? undefined} />
      </div>
      <ArticleListing items={items} emptyText="No published articles yet." />
    </div>
  );
}
