import Link from "next/link";
import { SectionHeader } from "@/components/ui";
import { citiesWithCounts, listCities, listProvinces } from "@/db/queries/geo";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 3600;
export const metadata = buildMetadata({ title: "Cities", description: "Local information for every major Pakistani city: businesses, services, news and guides.", path: "/cities" });

export default async function CitiesPage() {
  const [provinces, cities, counts] = await Promise.all([listProvinces(), listCities(), citiesWithCounts(100)]);
  const countBy = new Map(counts.map((c) => [c.id, c.count]));
  return (
    <div className="container-x py-8 sm:py-12">
      <SectionHeader as="h1" title="Cities" description="Pick your city for local businesses, services and news." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {provinces.map((p) => {
          const list = cities.filter((c) => c.provinceId === p.id);
          if (!list.length) return null;
          return (
            <section key={p.id} className="surface p-5">
              <h2 className="font-semibold">{p.name}</h2>
              <ul className="mt-2 divide-y divide-[var(--border)]">
                {list.map((c) => (
                  <li key={c.id}>
                    <Link href={`/cities/${c.slug}`} className="flex items-center justify-between py-2 hover:text-brand-700 dark:hover:text-brand-300">
                      <span>{c.name}</span>
                      <span className="text-sm tabular text-3">{countBy.get(c.id) ? `${countBy.get(c.id)} listed` : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
