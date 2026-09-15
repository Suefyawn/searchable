import { notFound } from "next/navigation";
import { SectionHub, pageParam, sectionMetadata } from "@/components/section-pages";

export const revalidate = 300;
type Props = { params: Promise<{ n: string }> };

export async function generateMetadata({ params }: Props) {
  const { n } = await params;
  return sectionMetadata("guide", pageParam(n));
}

export default async function Page({ params }: Props) {
  const { n } = await params;
  const page = pageParam(n);
  if (page < 2 || String(page) !== n) notFound();
  return <SectionHub kind="guide" page={page} />;
}
