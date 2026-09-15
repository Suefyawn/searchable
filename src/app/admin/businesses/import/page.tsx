import { requireRole } from "@/lib/auth";
import { Importer } from "./importer";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireRole("editor");
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Bulk import businesses</h1>
      <p className="mb-6 max-w-3xl text-sm text-2">
        Upload a CSV. Every row is validated, phone numbers normalised to +92, category and city matched by slug or name, and checked against existing listings by phone, name and location. Rows go to the review queue unless you publish immediately.
      </p>
      <Importer />
    </div>
  );
}
