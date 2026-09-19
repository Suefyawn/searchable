import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, Details, Section, Status } from "@/components/admin";
import { Field, Input, Select } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireRole } from "@/lib/auth";
import { formatDate, timeAgo } from "@/lib/format";
import { userFootprint } from "@/lib/users";
import { ActionForm } from "@/components/admin/action-form";
import { deleteUser, revokeSessions, setUserBanned, setUserPassword, updateUser } from "../actions";

export const dynamic = "force-dynamic";
const ROLES = ["user", "business_owner", "editor", "admin"] as const;

/** One account: edit it, set a password, sign it out, ban it from the community, see what it owns, delete it. */
export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("admin");
  const { id } = await params;
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  if (!user) notFound();
  const [footprint, member, sessions, businesses, professionals, posts, orders, claims] = await Promise.all([
    userFootprint(id),
    db.query.memberProfiles.findFirst({ where: eq(schema.memberProfiles.userId, id) }),
    db.select({ id: schema.sessions.id, userAgent: schema.sessions.userAgent, ipAddress: schema.sessions.ipAddress, updatedAt: schema.sessions.updatedAt, active: sql<boolean>`${schema.sessions.expiresAt} > ${Date.now()}` }).from(schema.sessions).where(eq(schema.sessions.userId, id)).orderBy(desc(schema.sessions.updatedAt)).limit(10),
    db.query.businesses.findMany({ where: eq(schema.businesses.ownerUserId, id), columns: { id: true, name: true, slug: true, status: true, isVerified: true }, limit: 20 }),
    db.query.professionals.findMany({ where: eq(schema.professionals.ownerUserId, id), columns: { id: true, name: true, slug: true, status: true }, limit: 5 }),
    db.query.posts.findMany({ where: eq(schema.posts.authorId, id), columns: { id: true, title: true, slug: true, status: true, kind: true }, orderBy: [desc(schema.posts.createdAt)], limit: 10 }),
    db.query.orders.findMany({ where: eq(schema.orders.userId, id), columns: { id: true, invoiceNo: true, status: true, createdAt: true }, orderBy: [desc(schema.orders.createdAt)], limit: 10 }),
    db.query.businessClaims.findMany({ where: eq(schema.businessClaims.userId, id), columns: { id: true, status: true, createdAt: true }, with: { business: { columns: { name: true, slug: true } } }, limit: 10 }),
  ]);
  const isMe = user.id === me.id;

  return (
    <AdminPage title={user.name} description={user.email}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <Section title="Account">
            <ActionForm action={updateUser.bind(null, id)} submit="Save" pendingLabel="Saving" className="max-w-lg space-y-4">
              <Field label="Name" htmlFor="name">
                <Input id="name" name="name" defaultValue={user.name} required maxLength={120} />
              </Field>
              <Field label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" defaultValue={user.email} required maxLength={200} />
              </Field>
              <Field label="Role" htmlFor="role" help={isMe ? "Your own admin role cannot be removed here." : "The last admin cannot be demoted."}>
                <Select id="role" name="role" defaultValue={user.role} disabled={isMe}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace("_", " ")}
                    </option>
                  ))}
                </Select>
                {isMe ? <input type="hidden" name="role" value={user.role} /> : null}
              </Field>
              <label className="flex items-center gap-2 text-[14px]">
                <input type="checkbox" name="emailVerified" defaultChecked={user.emailVerified} className="size-4" />
                Email verified
              </label>
            </ActionForm>
          </Section>

          <Section title="Password" description="Sets a new password and signs the account out of every device. Share it with the person directly; they can change it from their account page.">
            <ActionForm action={setUserPassword.bind(null, id)} submit="Set password" pendingLabel="Setting" variant="outline" className="max-w-lg">
              <Field label="New password" htmlFor="password" help="At least 8 characters.">
                <Input id="password" name="password" type="text" required minLength={8} maxLength={128} autoComplete="new-password" />
              </Field>
            </ActionForm>
          </Section>

          <Section title="Sessions" description={footprint.sessions ? `${footprint.sessions} active.` : "Not signed in anywhere."} action={footprint.sessions ? <ActionForm action={revokeSessions.bind(null, id)} submit="Sign out everywhere" size="sm" variant="outline" inline /> : undefined}>
            {sessions.length ? (
              <ul className="divide-y divide-[var(--border)] border-y border-line text-[13.5px]">
                {sessions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <span className={s.active ? "font-medium" : "text-3"}>{s.active ? "active" : "expired"}</span>
                    <span className="min-w-0 flex-1 truncate text-2">{s.userAgent ?? "unknown device"}</span>
                    <span className="text-3">{s.ipAddress ?? ""}</span>
                    <span className="text-3">{timeAgo(s.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>

          <Section title="Community" description={member ? `@${member.handle}, ${member.postCount} posts, ${member.commentCount} comments, ${member.likesReceived} likes received.` : "No community profile yet (one is created on their first post or comment)."} action={member ? <ActionForm action={setUserBanned.bind(null, id, !member.isBanned)} submit={member.isBanned ? "Lift ban" : "Ban from community"} size="sm" variant={member.isBanned ? "outline" : "danger"} confirm={member.isBanned ? undefined : `Ban ${user.name} from posting and commenting? They stay signed out until the ban is lifted.`} inline /> : undefined}>
            {member ? (
              <p className="text-[14px]">
                <Link href={`/u/${member.handle}`} className="underline underline-offset-4">
                  Public profile
                </Link>
                {member.isBanned ? <Status value="banned" className="ml-2" /> : null}
                {member.isVerified ? <Status value="verified" className="ml-2" /> : null}
              </p>
            ) : null}
            {posts.length ? (
              <ul className="mt-3 divide-y divide-[var(--border)] border-y border-line text-[13.5px]">
                {posts.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <span className="w-20 text-3">{p.kind}</span>
                    <Link href={`/community/post/${p.slug}`} className="min-w-0 flex-1 truncate underline-offset-4 hover:underline">
                      {p.title}
                    </Link>
                    <Status value={p.status} />
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>

          <Section title="Delete account" description="Removes the account, its sessions, community profile, posts, comments, likes and saved items. Businesses, professional profiles, reviews, orders and pitches stay on the site without an owner.">
            <ActionForm action={deleteUser.bind(null, id)} submit="Delete this account" variant="danger" size="sm" confirm={`Delete ${user.name} (${user.email})? This cannot be undone.`} inline />
            {isMe ? <p className="mt-2 text-[13px] text-3">This is your own account; another admin has to do it.</p> : null}
          </Section>
        </div>

        <aside className="space-y-8 self-start lg:sticky lg:top-24">
          <Section title="Summary">
            <Details
              items={[
                { label: "Role", value: <Status value={user.role} /> },
                { label: "Email", value: user.emailVerified ? "verified" : "unverified" },
                { label: "Joined", value: formatDate(user.createdAt, { dateStyle: "medium" }) },
                { label: "Businesses", value: footprint.businesses },
                { label: "Professional", value: footprint.professionals ? "yes" : "no" },
                { label: "Posts", value: footprint.posts },
                { label: "Comments", value: footprint.comments },
                { label: "Reviews", value: footprint.reviews },
                { label: "Orders", value: footprint.orders },
                { label: "Claims", value: footprint.claims },
                { label: "Notifications", value: Object.entries(user.notificationPrefs ?? {}).filter(([, on]) => !on).map(([k]) => `${k} off`).join(", ") || "all on" },
              ]}
            />
          </Section>
          {businesses.length ? (
            <Section title="Businesses">
              <ul className="space-y-1 text-[14px]">
                {businesses.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2">
                    <Link href={`/b/${b.slug}`} className="min-w-0 truncate underline-offset-4 hover:underline">
                      {b.name}
                    </Link>
                    <span className="flex shrink-0 gap-1">
                      {b.isVerified ? <Status value="verified" /> : null}
                      <Status value={b.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {professionals.length ? (
            <Section title="Professional profile">
              <ul className="space-y-1 text-[14px]">
                {professionals.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link href={`/p/${p.slug}`} className="min-w-0 truncate underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    <Status value={p.status} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {claims.length ? (
            <Section title="Claims">
              <ul className="space-y-1 text-[14px]">
                {claims.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <Link href={`/b/${c.business.slug}`} className="min-w-0 truncate underline-offset-4 hover:underline">
                      {c.business.name}
                    </Link>
                    <Status value={c.status} />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {orders.length ? (
            <Section title="Orders">
              <ul className="space-y-1 text-[14px]">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/orders?q=${encodeURIComponent(o.invoiceNo)}`} className="underline-offset-4 hover:underline">
                      {o.invoiceNo}
                    </Link>
                    <span className="flex items-center gap-2 text-3">
                      {timeAgo(o.createdAt)}
                      <Status value={o.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </aside>
      </div>
    </AdminPage>
  );
}
