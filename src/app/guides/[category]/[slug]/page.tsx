import { ArticleRoute, articleMetadata } from "@/components/section-pages";

export const revalidate = 600;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ category: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  return articleMetadata("guide", category, slug);
}

export default async function Page({ params }: Props) {
  const { category, slug } = await params;
  return <ArticleRoute kind="guide" category={category} slug={slug} />;
}
