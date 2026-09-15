import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AdminPage, EmptyRow, Table, TBody, Td, THead } from "@/components/admin";
import { Button, Input } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const Redirect = z.object({ fromPath: z.string().trim().regex(/^\/[^\s?#]*$/, "Must start with /"), toPath: z.string().trim().min(1), statusCode: z.coerce.number().int().refine((n) => [301, 302, 307, 308].includes(n)) });

async function addRedirect(formData: FormData) {
  "use server";
  await requireRole("editor");
  const parsed = Redirect.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const d = parsed.data;
  const db = await getDb();
  await db.insert(schema.redirects).values({ fromPath: d.fromPath.replace(/\/+$/, "") || "/", toPath: d.toPath, statusCode: d.statusCode }).onConflictDoUpdate({ target: schema.redirects.fromPath, set: { toPath: d.toPath, statusCode: d.statusCode } });
  revalidatePath("/admin/redirects");
}

async function removeRedirect(id: string) {
  "use server";
  await requireRole("editor");
  const db = await getDb();
  await db.delete(schema.redirects).where(eq(schema.redirects.id, id));
  revalidatePath("/admin/redirects");
}

export default async function AdminRedirects() {
  const db = await getDb();
  const rows = await db.query.redirects.findMany({ orderBy: [desc(schema.redirects.createdAt)], limit: 200 });
  return (
    <AdminPage title="Redirects" description="When a public URL changes, add the old path here. Applied whenever a request would otherwise 404. Merged duplicate listings add their own rows automatically.">
      <form action={addRedirect} className="mb-8 flex flex-wrap items-end gap-3 border-y border-line py-4">
        <label className="text-[12px] text-3">
          From path
          <Input name="fromPath" required placeholder="/old/path" className="mt-1 h-9 w-64 font-mono text-sm" />
        </label>
        <label className="text-[12px] text-3">
          To
          <Input name="toPath" required placeholder="/new/path or https://…" className="mt-1 h-9 w-72 font-mono text-sm" />
        </label>
        <label className="text-[12px] text-3">
          Status
          <select name="statusCode" defaultValue="301" className="mt-1 block h-9 border border-line bg-surface px-2 text-sm">
            <option value="301">301 permanent</option>
            <option value="302">302 temporary</option>
            <option value="308">308 permanent (keep method)</option>
          </select>
        </label>
        <Button size="sm" type="submit">
          Add redirect
        </Button>
      </form>
      <Table>
        <THead cols={["From", "To", "Code", "Added", ""]} />
        <TBody>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="font-mono text-[13px]">{r.fromPath}</Td>
              <Td className="font-mono text-[13px]">{r.toPath}</Td>
              <Td muted>{r.statusCode}</Td>
              <Td muted className="whitespace-nowrap text-[13px]">
                {formatDate(r.createdAt)}
              </Td>
              <Td align="right">
                <form action={removeRedirect.bind(null, r.id)}>
                  <Button size="sm" variant="ghost" type="submit">
                    Remove
                  </Button>
                </form>
              </Td>
            </tr>
          ))}
          {!rows.length ? <EmptyRow colSpan={5}>No redirects yet.</EmptyRow> : null}
        </TBody>
      </Table>
    </AdminPage>
  );
}
