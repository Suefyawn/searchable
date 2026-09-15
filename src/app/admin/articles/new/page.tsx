import { ArticleEditor } from "../editor";
import { editorOptions } from "../_data";

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const opts = await editorOptions();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New article</h1>
      <ArticleEditor initial={{ kind: kind === "guide" ? "guide" : "news" }} {...opts} />
    </div>
  );
}
