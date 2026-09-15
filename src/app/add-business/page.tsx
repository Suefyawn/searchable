import { listBusinessCategories } from "@/db/queries/directory";
import { listCities } from "@/db/queries/geo";
import { buildMetadata } from "@/lib/seo";
import { AddBusinessForm } from "./form";

export const metadata = buildMetadata({ title: "Add your business", description: "List your business on Searchable for free. Reviewed within two working days.", path: "/add-business" });
export const revalidate = 3600;

export default async function AddBusinessPage() {
  const [categories, cities] = await Promise.all([listBusinessCategories(), listCities()]);
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold">Add your business</h1>
        <p className="mt-2 text-2">Free. We review every submission within two working days, then it goes live with a page, search presence and an enquiry form. Create an account first if you want to manage it later.</p>
        <div className="mt-6 surface p-6">
          <AddBusinessForm categories={categories.map((c) => ({ id: c.id, name: c.namePlural ?? c.name }))} cities={cities.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
      </div>
    </div>
  );
}
