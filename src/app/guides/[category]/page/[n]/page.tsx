import { notFound } from "next/navigation";
import { CategoryPage, categoryMetadata, pageParam } from "@/components/section-pages";

export const revalidate = 300;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ category: string; n: string }> };

export async function generateMetadata({ params }: Props) {
  const { category, n } = await params;
  return categoryMetadata("guide", category, pageParam(n));
}

export default async function Page({ params }: Props) {
  const { category, n } = await params;
  const page = pageParam(n);
  if (page < 2 || String(page) !== n) notFound();
  return <CategoryPage kind="guide" slug={category} page={page} />;
}
