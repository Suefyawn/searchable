import { notFound } from "next/navigation";
import { PAGES } from "@/content/pages";
import { renderMarkdown } from "@/lib/markdown";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ page: string }> };

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const { page } = await params;
  const p = PAGES[page];
  if (!p) return {};
  return buildMetadata({ title: p.title, description: p.description, path: `/${page}` });
}

export default async function StaticPage({ params }: Props) {
  const { page } = await params;
  const p = PAGES[page];
  if (!p) notFound();
  return (
    <div className="container-x py-10 sm:py-14">
      <h1 className="text-3xl font-semibold sm:text-4xl">{p.title}</h1>
      <p className="mt-3 max-w-[68ch] text-lg text-2">{p.description}</p>
      <div className="prose prose-searchable mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(p.body) }} />
    </div>
  );
}
