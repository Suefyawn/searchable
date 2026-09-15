import { notFound } from "next/navigation";
import { pageParam } from "@/components/section-pages";
import { ProfessionList, professionMetadata } from "../../list";

export const revalidate = 1800;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}
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
