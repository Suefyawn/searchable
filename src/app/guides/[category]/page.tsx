import { CategoryPage, categoryMetadata } from "@/components/section-pages";

export const revalidate = 300;
type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  return categoryMetadata("guide", category);
}

export default async function Page({ params }: Props) {
  const { category } = await params;
  return <CategoryPage kind="guide" slug={category} />;
}
