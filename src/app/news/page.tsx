import { SectionHub, pageParam, sectionMetadata } from "@/components/section-pages";

export const revalidate = 300;
export const metadata = sectionMetadata("news");

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return <SectionHub kind="news" page={pageParam(page)} />;
}
