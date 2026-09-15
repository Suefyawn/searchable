import { notFound } from "next/navigation";
import { pageParam } from "@/components/section-pages";
import { ProfessionList, professionMetadata } from "../../list";

export const revalidate = 1800;
type Props = { params: Promise<{ profession: string; n: string }> };

export async function generateMetadata({ params }: Props) {
  const { profession, n } = await params;
  return professionMetadata(profession, pageParam(n));
}

export default async function ProfessionListPageN({ params }: Props) {
  const { profession, n } = await params;
  const page = pageParam(n);
  if (page < 2 || String(page) !== n) notFound();
  return <ProfessionList profession={profession} page={page} />;
}
