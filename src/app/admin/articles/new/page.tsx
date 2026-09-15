import { AdminPage } from "@/components/admin";
import { ArticleEditor } from "../editor";
import { editorOptions } from "../_data";

/** `?kind=guide&title=…` prefills a guide from a zero-result search on the dashboard. */
export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ kind?: string; title?: string }> }) {
  const { kind, title } = await searchParams;
  const opts = await editorOptions();
  const isGuide = kind === "guide";
  const seed = title ? title.trim().replace(/^\w/, (c) => c.toUpperCase()).slice(0, 120) : undefined;
  return (
    <AdminPage title={isGuide ? "New guide" : "New story"} description={isGuide ? "Answer one question completely: steps, documents, fees, time, and where it can go wrong." : "Lead with the number or the change, say who it affects, link the calculator or data series."} wide>
      <ArticleEditor initial={{ kind: isGuide ? "guide" : "news", ...(seed ? { title: seed } : {}) }} {...opts} />
    </AdminPage>
  );
}
