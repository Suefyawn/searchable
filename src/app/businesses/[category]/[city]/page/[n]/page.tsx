import { notFound } from "next/navigation";
import { pageParam } from "@/components/section-pages";
import { CategoryCityList, categoryCityMetadata } from "../../list";

export const revalidate = 3600;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ category: string; city: string; n: string }> };

export async function generateMetadata({ params }: Props) {
  const { category, city, n } = await params;
  return categoryCityMetadata(category, city, pageParam(n));
}

export default async function CategoryCityPageN({ params }: Props) {
  const { category, city, n } = await params;
  const page = pageParam(n);
  if (page < 2 || String(page) !== n) notFound();
  return <CategoryCityList category={category} city={city} page={page} />;
}
