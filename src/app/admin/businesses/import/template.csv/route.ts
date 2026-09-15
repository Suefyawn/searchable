import { TEMPLATE_CSV } from "@/lib/import";

export function GET() {
  return new Response(TEMPLATE_CSV, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="searchable-import-template.csv"' } });
}
