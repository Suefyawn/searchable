import { listEntities } from "@/db/queries/entities";
import { listCities } from "@/db/queries/geo";
import { getDb } from "@/db";
import { ArticleEditor } from "../editor";

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const db = await getDb();
  const [categories, cities, entities] = await Promise.all([db.query.categories.findMany(), listCities(), listEntities(200)]);
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New article</h1>
      <ArticleEditor
        initial={{ kind: kind === "guide" ? "guide" : "news" }}
        categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        entities={entities.map((e) => ({ slug: e.slug, name: e.name }))}
      />
    </div>
  );
}
