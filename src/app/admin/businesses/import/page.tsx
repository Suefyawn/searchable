import Link from "next/link";
import { AdminPage } from "@/components/admin";
import { requireRole } from "@/lib/auth";
import { Importer } from "./importer";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireRole("editor");
  return (
    <AdminPage
      title="Import businesses"
      description="Upload a CSV. Every row is validated, phone numbers normalised to +92, category and city matched by slug or name, and checked against existing listings by phone, name and location. Include an email column wherever you can: that is what the claim outreach runs on."
      actions={
        <Link href="/admin/businesses" className="text-sm text-2 hover:text-[var(--text)]">
          ← All businesses
        </Link>
      }
    >
      <Importer />
    </AdminPage>
  );
}
