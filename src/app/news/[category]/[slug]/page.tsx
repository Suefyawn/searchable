import { ArticleRoute, articleMetadata } from "@/components/section-pages";

export const revalidate = 600;

type Props = { params: Promise<{ category: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  return articleMetadata("news", category, slug);
}

export default async function Page({ params }: Props) {
  const { category, slug } = await params;
  return <ArticleRoute kind="news" category={category} slug={slug} />;
}
