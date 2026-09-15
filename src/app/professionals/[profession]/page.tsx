import { ProfessionList, professionMetadata } from "./list";

export const revalidate = 1800;
type Props = { params: Promise<{ profession: string }> };

export async function generateMetadata({ params }: Props) {
  const { profession } = await params;
  return professionMetadata(profession);
}

export default async function ProfessionListPage({ params }: Props) {
  const { profession } = await params;
  return <ProfessionList profession={profession} page={1} />;
}
