import { NextResponse } from "next/server";
import { getSeries } from "@/db/queries/data";

/** Public JSON for a data series: { series, points: [{date, value}] } — newest last. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSeries(slug, 2000);
  if (!data) return NextResponse.json({ error: "Unknown series" }, { status: 404 });
  return NextResponse.json(
    {
      series: { slug: data.series.slug, name: data.series.name, unit: data.series.unit, frequency: data.series.frequency, source: data.series.sourceName, sourceUrl: data.series.sourceUrl },
      points: data.points.map((p) => ({ date: p.date, value: p.value })),
      attribution: "Searchable.pk — https://searchable.pk/data/" + data.series.slug,
    },
    { headers: { "cache-control": "public, max-age=600, s-maxage=600" } },
  );
}
