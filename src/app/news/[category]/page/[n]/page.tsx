import { notFound } from "next/navigation";
import { CategoryPage, categoryMetadata, pageParam } from "@/components/section-pages";

export const revalidate = 300;
type Props = { params: Promise<{ category: string; n: string }> };

export async function generateMetadata({ params }: Props) {
  const { category, n } = await params;
  return categoryMetadata("news", category, pageParam(n));
}

export default async function Page({ params }: Props) {
  const { category, n } = await params;
  const page = pageParam(n);
  if (page < 2 || String(page) !== n) notFound();
  return <CategoryPage kind="news" slug={category} page={page} />;
}
