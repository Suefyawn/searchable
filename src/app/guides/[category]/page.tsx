import { CategoryPage, categoryMetadata, pageParam } from "@/components/section-pages";

export const revalidate = 300;

type Props = { params: Promise<{ category: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  return categoryMetadata("guide", category);
}

export default async function Page({ params, searchParams }: Props) {
  const [{ category }, { page }] = await Promise.all([params, searchParams]);
  return <CategoryPage kind="guide" slug={category} page={pageParam(page)} />;
}
