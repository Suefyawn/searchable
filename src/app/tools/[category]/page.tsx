import { notFound } from "next/navigation";
import { ToolCard } from "@/components/cards";
import { Breadcrumbs, JsonLd, SectionHeader } from "@/components/ui";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { getToolsByCategory, isToolCategory } from "@/tools/registry";
import { TOOL_CATEGORIES } from "@/tools/types";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  if (!isToolCategory(category)) return {};
  const c = TOOL_CATEGORIES[category];
  return buildMetadata({ title: `${c.name} calculators`, description: `${c.description}. Free tools built for Pakistan, with sources and review dates.`, path: `/tools/${category}` });
}

export default async function Page({ params }: Props) {
  const { category } = await params;
  if (!isToolCategory(category)) notFound();
  const c = TOOL_CATEGORIES[category];
  const tools = getToolsByCategory(category);
  const crumbs = [{ name: "Tools", path: "/tools" }, { name: c.name, path: `/tools/${category}` }];
  return (
    <div className="container-x py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <SectionHeader as="h1" title={`${c.name} tools`} description={c.description} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
      </div>
    </div>
  );
}
