import { CategoryCityList, categoryCityMetadata } from "./list";

export const revalidate = 3600;
type Props = { params: Promise<{ category: string; city: string }> };

export async function generateMetadata({ params }: Props) {
  const { category, city } = await params;
  return categoryCityMetadata(category, city);
}

export default async function CategoryCityPage({ params }: Props) {
  const { category, city } = await params;
  return <CategoryCityList category={category} city={city} page={1} />;
}
