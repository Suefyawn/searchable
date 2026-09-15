import { notFound } from "next/navigation";
import { SectionHub, pageParam, sectionMetadata } from "@/components/section-pages";

export const revalidate = 300;
// Nothing is prerendered at build time, but exporting this is what makes the route ISR: without it a dynamic
// segment renders on every request. Pages are built on first visit and cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}
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
