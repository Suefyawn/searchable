import { NextResponse } from "next/server";
import { getSeries } from "@/db/queries/data";

/** Public JSON for a data series: { series, points: [{date, value}] }, newest last. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getSeries(slug, 2000);
  if (!data) return NextResponse.json({ error: "Unknown series" }, { status: 404 });
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const esc = (v: string | null | undefined) => (v && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : (v ?? ""));
    const csv = ["date,value,unit,note,source_url", ...data.points.map((p) => [p.date, p.value, data.series.unit, esc(p.note), esc(p.sourceUrl)].join(","))].join("\n");
    return new NextResponse(csv + "\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${data.series.slug}.csv"`, "cache-control": "public, max-age=600, s-maxage=600" } });
  }
  return NextResponse.json(
    {
      series: { slug: data.series.slug, name: data.series.name, unit: data.series.unit, frequency: data.series.frequency, source: data.series.sourceName, sourceUrl: data.series.sourceUrl },
      points: data.points.map((p) => ({ date: p.date, value: p.value })),
      attribution: "Searchable.pk, https://searchable.pk/data/" + data.series.slug,
    },
    { headers: { "cache-control": "public, max-age=600, s-maxage=600" } },
  );
}
