import { desc } from "drizzle-orm";
import { AdminPage, EmptyRow, Table, TBody, Td, THead } from "@/components/admin";
import { ActionForm } from "@/components/admin/action-form";
import { Field, Input, Select } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { formatDate, timeAgo } from "@/lib/format";
import { createApiKey, revokeApiKey } from "./actions";

export const dynamic = "force-dynamic";

/** Keys for the admin API (docs/ADMIN-API.md): one per external tool, revocable one by one. */
export default async function AdminApiKeys() {
  await requireRole("admin");
  const db = await getDb();
  const rows = await db.query.apiKeys.findMany({ orderBy: [desc(schema.apiKeys.createdAt)], limit: 100 });
  return (
    <AdminPage title="API keys" description="Each key lets a tool call /api/admin/* with Authorization: Bearer <key> and act as you, without a login. Make one key per tool so a leak costs one revocation. The key is shown once, right after it is made.">
      <ActionForm action={createApiKey} submit="Make key" pendingLabel="Making" className="mb-8 flex max-w-2xl flex-wrap items-end gap-3 border-y border-line py-4">
        <Field label="Name" htmlFor="name" help="What uses it: Cowork day task, Zapier, a script.">
          <Input id="name" name="name" required maxLength={80} autoComplete="off" className="w-64" />
        </Field>
        <Field label="Role" htmlFor="role" help="admin: everything the API exposes. editor: the desk, no accounts or settings.">
          <Select id="role" name="role" defaultValue="admin">
            <option value="admin">admin</option>
            <option value="editor">editor</option>
          </Select>
        </Field>
      </ActionForm>
      <Table>
        <THead cols={["Name", "Key", "Role", "Made", "Last used", ""]} />
        <TBody>
          {rows.map((k) => (
            <tr key={k.id} className={k.revokedAt ? "opacity-50" : undefined}>
              <Td>{k.name}</Td>
              <Td className="font-mono text-[13px]">{k.prefix}…</Td>
              <Td muted>{k.role}</Td>
              <Td muted className="whitespace-nowrap text-[13px]">
                {formatDate(k.createdAt)}
              </Td>
              <Td muted className="whitespace-nowrap text-[13px]">
                {k.revokedAt ? `revoked ${timeAgo(k.revokedAt)}` : k.lastUsedAt ? timeAgo(k.lastUsedAt) : "never"}
              </Td>
              <Td align="right">{k.revokedAt ? null : <ActionForm action={revokeApiKey.bind(null, k.id)} submit="Revoke" variant="ghost" size="sm" inline confirm={`Revoke "${k.name}"? Anything using it stops working now.`} />}</Td>
            </tr>
          ))}
          {!rows.length ? <EmptyRow colSpan={6}>No keys yet. The ADMIN_API_KEY environment variable still works alongside these.</EmptyRow> : null}
        </TBody>
      </Table>
    </AdminPage>
  );
}
