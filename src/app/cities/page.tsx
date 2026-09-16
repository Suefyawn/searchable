import Link from "next/link";
import { PhotoTile } from "@/components/photo-tiles";
import { SectionHeader } from "@/components/ui";
import { citiesWithCounts, listCities, listProvinces } from "@/db/queries/geo";
import { buildMetadata } from "@/lib/seo";
import { HUB_COPY } from "@/lib/seo-copy";

export const revalidate = 3600;
export const metadata = buildMetadata({ ...HUB_COPY.cities, path: "/cities" });

export default async function CitiesPage() {
  const [provinces, cities, counts] = await Promise.all([listProvinces(), listCities(), citiesWithCounts(100)]);
  const countBy = new Map(counts.map((c) => [c.id, c.count]));
  return (
    <div className="container-x py-8 sm:py-12">
      <SectionHeader as="h1" title="Cities in Pakistan" description="Pick your city for local businesses, bills and services, weather, prayer times and news." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {provinces.map((p) => {
          const list = cities.filter((c) => c.provinceId === p.id);
          if (!list.length) return null;
          return (
            <section key={p.id} className="lg:col-span-3">
              <h2 className="rule pt-3 font-display text-2xl">{p.name}</h2>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                {list.map((c) => (
                  <li key={c.id}>
                    <PhotoTile href={`/cities/${c.slug}`} title={c.name} meta={countBy.get(c.id) ? `${countBy.get(c.id)} business${countBy.get(c.id) === 1 ? "" : "es"}` : undefined} imageUrl={c.imageUrl ?? null} aspect="4/3" sizes="(min-width: 1024px) 220px, 50vw" />
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
