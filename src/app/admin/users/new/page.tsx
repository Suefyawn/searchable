import { AdminPage } from "@/components/admin";
import { Field, Input, Select } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { ActionForm } from "@/components/admin/action-form";
import { createUser } from "../actions";

export const dynamic = "force-dynamic";

/** Create an account by hand: an editor, a business owner you are onboarding, a second admin. */
export default async function NewUser() {
  await requireRole("admin");
  return (
    <AdminPage title="Add user" description="Creates the account with the password you set here; tell the person to change it from their account page. The email is marked verified when you tick the box, so no confirmation mail goes out.">
      <ActionForm action={createUser} submit="Create account" pendingLabel="Creating" className="max-w-lg space-y-4">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required maxLength={120} autoComplete="off" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required maxLength={200} autoComplete="off" />
        </Field>
        <Field label="Password" htmlFor="password" help="At least 8 characters.">
          <Input id="password" name="password" type="text" required minLength={8} maxLength={128} autoComplete="new-password" />
        </Field>
        <Field label="Role" htmlFor="role" help="user: reads, saves, posts · business owner: runs listings · editor: the desk, no accounts · admin: everything.">
          <Select id="role" name="role" defaultValue="user">
            <option value="user">user</option>
            <option value="business_owner">business owner</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="emailVerified" defaultChecked className="size-4" />
          Email verified
        </label>
      </ActionForm>
    </AdminPage>
  );
}
