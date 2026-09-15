import { notFound } from "next/navigation";
import { pageParam } from "@/components/section-pages";
import { CategoryCityList, categoryCityMetadata } from "../../list";

export const revalidate = 3600;
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
