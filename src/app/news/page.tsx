import { SectionHub, sectionMetadata } from "@/components/section-pages";

export const revalidate = 300;
export const metadata = sectionMetadata("news");

export default function Page() {
  return <SectionHub kind="news" />;
}
