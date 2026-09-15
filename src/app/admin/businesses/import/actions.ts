"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { commitImport, previewImport, type PreviewRow } from "@/lib/import";

export async function previewImportAction(csv: string) {
  await requireRole("editor");
  if (csv.length > 2_000_000) return { rows: [], header: [], error: "File too large (2 MB max, split it)." };
  return previewImport(csv);
}

export async function commitImportAction(rows: PreviewRow[], opts: { publish: boolean; includeDuplicates: boolean }) {
  const user = await requireRole("editor");
  const result = await commitImport(rows, { ...opts, source: `import:${user.email}` });
  revalidatePath("/admin/businesses");
  revalidatePath("/businesses");
  return result;
}
