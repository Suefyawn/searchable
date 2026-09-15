import { CategoryPage, categoryMetadata, pageParam } from "@/components/section-pages";

export const revalidate = 300;

type Props = { params: Promise<{ category: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  return categoryMetadata("news", category);
}

export default async function Page({ params, searchParams }: Props) {
  const [{ category }, { page }] = await Promise.all([params, searchParams]);
  return <CategoryPage kind="news" slug={category} page={pageParam(page)} />;
}
