import Link from "next/link";
import { ToolCard, toolExample } from "@/components/cards";
import { SectionHeader } from "@/components/ui";
import { buildMetadata } from "@/lib/seo";
import { HUB_COPY } from "@/lib/seo-copy";
import { TOOLS } from "@/tools/registry";
import { TOOL_CATEGORIES, type ToolCategory } from "@/tools/types";

export const metadata = buildMetadata({
  ...HUB_COPY.tools,
  path: "/tools",
});

export default function ToolsPage() {
  const cats = (Object.keys(TOOL_CATEGORIES) as ToolCategory[]).filter((c) => TOOLS.some((t) => t.category === c));
  return (
    <div className="container-x py-8 sm:py-12">
      <SectionHeader as="h1" title="Calculators & tools" description="Every number shows its source and the date it was last reviewed. Calculations run in your browser: nothing you enter is stored." />
      <nav className="flex flex-wrap gap-2" aria-label="Tool categories">
        {cats.map((c) => (
          <Link key={c} href={`/tools/${c}`} className="border border-line px-3 py-1.5 text-sm text-2 hover:bg-surface-2 hover:text-[var(--text)]">
            {TOOL_CATEGORIES[c].name}
          </Link>
        ))}
      </nav>
      {cats.map((c) => (
        <section key={c} className="mt-10">
          <SectionHeader title={TOOL_CATEGORIES[c].name} description={TOOL_CATEGORIES[c].description} href={`/tools/${c}`} as="h2" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.filter((t) => t.category === c).map((t) => (
              <ToolCard key={t.slug} tool={t} example={toolExample(t)} />
            ))}
          </div>
        </section>
      ))}
      <div className="mt-14 surface p-6 sm:p-8">
        <p className="text-lg font-semibold">Missing a calculator?</p>
        <p className="mt-1 text-2">We build tools from real search demand. <Link href="/contact" className="text-brand-700 dark:text-brand-300 underline">Tell us what you need</Link> and we will add it to the queue.</p>
      </div>
    </div>
  );
}
