import { CategoryCityList, categoryCityMetadata } from "./list";

export const revalidate = 3600;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ category: string; city: string }> };

export async function generateMetadata({ params }: Props) {
  const { category, city } = await params;
  return categoryCityMetadata(category, city);
}

export default async function CategoryCityPage({ params }: Props) {
  const { category, city } = await params;
  return <CategoryCityList category={category} city={city} page={1} />;
}
