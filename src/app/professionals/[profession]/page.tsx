import { ProfessionList, professionMetadata } from "./list";

export const revalidate = 1800;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}
type Props = { params: Promise<{ profession: string }> };

export async function generateMetadata({ params }: Props) {
  const { profession } = await params;
  return professionMetadata(profession);
}

export default async function ProfessionListPage({ params }: Props) {
  const { profession } = await params;
  return <ProfessionList profession={profession} page={1} />;
}
