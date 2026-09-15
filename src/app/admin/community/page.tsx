import { desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, Empty, FilterTabs, Row, Rows, Status } from "@/components/admin";
import { Badge, Button } from "@/components/ui";
import { getDb, rawQuery, schema } from "@/db";
import { kindLabel } from "@/lib/community";
import { moderateComment, moderateMember, moderatePost } from "@/lib/community-actions";
import { formatDate, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

type View = "posts" | "published" | "comments" | "reported" | "members";
const VIEWS: { key: View; label: string }[] = [
  { key: "posts", label: "Posts to approve" },
  { key: "published", label: "Live posts" },
  { key: "comments", label: "Comments" },
  { key: "reported", label: "Reported" },
  { key: "members", label: "Members" },
];

/** Community moderation: approve posts, watch comments, act on reports, verify or ban members. */
export default async function AdminCommunity({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "posts" } = await searchParams;
  const v = (VIEWS.some((x) => x.key === view) ? view : "posts") as View;
  const db = await getDb();
  const [counts] = await rawQuery<Record<string, number>>(
    db,
    sql`select
      (select count(*) from posts where status = 'pending')::int as posts,
      (select count(*) from posts where status = 'published')::int as published,
      (select count(*) from comments where status in ('pending', 'published') and created_at > now() - interval '7 days')::int as comments,
      (select count(*) from reports where status = 'open' and target_type in ('post', 'comment', 'member'))::int as reported,
      (select count(*) from member_profiles)::int as members`,
  );

  return (
    <AdminPage title="Community" description="Approve what is real and useful, hide what is not, and close the account of anyone running a scam. Verified members' posts carry the mark automatically.">
      <FilterTabs items={VIEWS.map((x) => ({ href: `/admin/community?view=${x.key}`, label: x.label, count: counts?.[x.key] ?? 0, active: v === x.key }))} className="mb-2" />
      {v === "posts" || v === "published" ? <PostsView status={v === "posts" ? "pending" : "published"} /> : v === "comments" ? <CommentsView /> : v === "reported" ? <ReportedView /> : <MembersView />}
    </AdminPage>
  );
}

async function PostsView({ status }: { status: "pending" | "published" }) {
  const db = await getDb();
  const rows = await db.query.posts.findMany({ where: eq(schema.posts.status, status), orderBy: [desc(schema.posts.createdAt)], limit: 60, with: { author: { columns: { name: true, email: true } }, city: { columns: { name: true } } } });
  return (
    <Rows>
      {rows.map((p) => (
        <Row
          key={p.id}
          actions={
            <form action={moderatePost} className="flex flex-col items-end gap-1.5">
              <input type="hidden" name="id" value={p.id} />
              {status === "pending" ? <input name="note" placeholder="Note to author (optional)" className="h-8 w-60 border border-line bg-surface px-2 text-[13px] outline-none focus:border-ink-500" /> : null}
              <div className="flex flex-wrap justify-end gap-1.5">
                {status === "pending" ? (
                  <>
                    <Button size="sm" type="submit" name="action" value="approve">
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost" type="submit" name="action" value="reject">
                      Reject
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" type="submit" name="action" value="verify">
                      {p.isVerified ? "Unverify" : "Mark verified"}
                    </Button>
                    <Button size="sm" variant="outline" type="submit" name="action" value="pin">
                      {p.isPinned ? "Unpin" : "Pin"}
                    </Button>
                    <Button size="sm" variant="ghost" type="submit" name="action" value="hide">
                      Hide
                    </Button>
                  </>
                )}
              </div>
            </form>
          }
        >
          <p className="flex flex-wrap items-center gap-2">
            {status === "published" ? (
              <Link href={`/community/post/${p.slug}`} className="font-medium underline-offset-4 hover:underline" target="_blank">
                {p.title}
              </Link>
            ) : (
              <span className="font-medium">{p.title}</span>
            )}
            <Badge>{kindLabel(p.kind)}</Badge>
            {p.isVerified ? <Badge tone="success">verified</Badge> : null}
            {p.isPinned ? <Badge>pinned</Badge> : null}
          </p>
          <p className="mt-0.5 text-[13px] text-2">
            {p.author.name} ({p.author.email}) · {p.city?.name ?? "anywhere"} · {timeAgo(p.createdAt)} · {p.likeCount} likes · {p.commentCount} comments
            {p.meta.price !== undefined ? ` · Rs ${p.meta.price.toLocaleString()}` : ""}
            {p.meta.company ? ` · ${p.meta.company}` : ""}
          </p>
          <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[14px]">{p.body}</p>
          {p.images.length ? <p className="mt-1 text-[12.5px] text-3">{p.images.length} photo(s)</p> : null}
          {[p.meta.contactPhone, p.meta.contactWhatsapp, p.meta.contactEmail, p.meta.applyUrl].some(Boolean) ? <p className="mt-1 text-[12.5px] text-3">Contact: {[p.meta.contactPhone, p.meta.contactWhatsapp, p.meta.contactEmail, p.meta.applyUrl].filter(Boolean).join(" · ")}</p> : null}
        </Row>
      ))}
      {!rows.length ? <Empty>{status === "pending" ? "Nothing waiting." : "No live posts."}</Empty> : null}
    </Rows>
  );
}

async function CommentsView() {
  const db = await getDb();
  const rows = await db.query.comments.findMany({ where: inArray(schema.comments.status, ["pending", "published", "hidden"]), orderBy: [desc(schema.comments.createdAt)], limit: 80, with: { author: { columns: { name: true, email: true } } } });
  return (
    <Rows>
      {rows.map((c) => (
        <Row
          key={c.id}
          actions={
            <form action={moderateComment} className="flex gap-1.5">
              <input type="hidden" name="id" value={c.id} />
              {c.status !== "published" ? (
                <Button size="sm" type="submit" name="action" value="approve">
                  Approve
                </Button>
              ) : null}
              {c.status !== "hidden" ? (
                <Button size="sm" variant="ghost" type="submit" name="action" value="hide">
                  Hide
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" type="submit" name="action" value="delete">
                Delete
              </Button>
            </form>
          }
        >
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-2">
            <span className="font-medium text-[var(--text)]">{c.author.name}</span>
            <span>{c.author.email}</span>
            <Status value={c.status} />
            <span>{timeAgo(c.createdAt)}</span>
            <span>
              on {c.targetType} <span className="font-mono text-[12px]">{c.targetId.slice(0, 8)}</span>
            </span>
            {c.parentId ? <span>reply</span> : null}
            <span>{c.likeCount} likes</span>
          </p>
          <p className="mt-1 whitespace-pre-line text-[14.5px]">{c.body}</p>
        </Row>
      ))}
      {!rows.length ? <Empty>No comments yet.</Empty> : null}
    </Rows>
  );
}

async function ReportedView() {
  const db = await getDb();
  const reports = await db.query.reports.findMany({ where: sql`${schema.reports.status} = 'open' and ${schema.reports.targetType} in ('post', 'comment', 'member')`, orderBy: [desc(schema.reports.createdAt)], limit: 60 });
  const postIds = reports.filter((r) => r.targetType === "post").map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.targetType === "comment").map((r) => r.targetId);
  const memberIds = reports.filter((r) => r.targetType === "member").map((r) => r.targetId);
  const [posts, comments, members] = await Promise.all([
    postIds.length ? db.query.posts.findMany({ where: inArray(schema.posts.id, postIds), columns: { id: true, title: true, slug: true, status: true } }) : [],
    commentIds.length ? db.query.comments.findMany({ where: inArray(schema.comments.id, commentIds), columns: { id: true, body: true, status: true } }) : [],
    memberIds.length ? db.query.memberProfiles.findMany({ where: inArray(schema.memberProfiles.userId, memberIds), columns: { userId: true, handle: true, displayName: true, isBanned: true } }) : [],
  ]);
  return (
    <Rows>
      {reports.map((r) => {
        const post = posts.find((p) => p.id === r.targetId);
        const comment = comments.find((c) => c.id === r.targetId);
        const member = members.find((m) => m.userId === r.targetId);
        return (
          <Row
            key={r.id}
            actions={
              <div className="flex flex-col items-end gap-1.5">
                {post ? (
                  <form action={moderatePost} className="flex gap-1.5">
                    <input type="hidden" name="id" value={post.id} />
                    <Button size="sm" variant="ghost" type="submit" name="action" value="hide">
                      Hide post
                    </Button>
                  </form>
                ) : null}
                {comment ? (
                  <form action={moderateComment} className="flex gap-1.5">
                    <input type="hidden" name="id" value={comment.id} />
                    <Button size="sm" variant="ghost" type="submit" name="action" value="hide">
                      Hide comment
                    </Button>
                  </form>
                ) : null}
                {member ? (
                  <form action={moderateMember}>
                    <input type="hidden" name="userId" value={member.userId} />
                    <Button size="sm" variant="ghost" type="submit" name="action" value={member.isBanned ? "unban" : "ban"}>
                      {member.isBanned ? "Unban" : "Ban member"}
                    </Button>
                  </form>
                ) : null}
                <Link href={`/admin/reports`} className="text-[12.5px] text-2 underline-offset-4 hover:underline">
                  Resolve in Reports →
                </Link>
              </div>
            }
          >
            <p className="flex flex-wrap items-center gap-2 text-[13px]">
              <Badge tone="warning">{r.reason}</Badge>
              <span className="capitalize">{r.targetType}</span>
              <span className="text-3">
                {r.reporterEmail ?? "anonymous"} · {formatDate(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </p>
            {post ? (
              <p className="mt-1">
                <Link href={`/community/post/${post.slug}`} target="_blank" className="font-medium underline-offset-4 hover:underline">
                  {post.title}
                </Link>{" "}
                <Status value={post.status} />
              </p>
            ) : null}
            {comment ? (
              <p className="mt-1 line-clamp-3 text-[14px]">
                <Status value={comment.status} className="mr-2" />
                {comment.body}
              </p>
            ) : null}
            {member ? (
              <p className="mt-1">
                <Link href={`/u/${member.handle}`} target="_blank" className="font-medium underline-offset-4 hover:underline">
                  {member.displayName} (@{member.handle})
                </Link>
                {member.isBanned ? <Badge tone="danger" className="ml-2">banned</Badge> : null}
              </p>
            ) : null}
            {r.details ? <p className="mt-1 text-[14px] text-2">{r.details}</p> : null}
          </Row>
        );
      })}
      {!reports.length ? <Empty>No open reports on community content.</Empty> : null}
    </Rows>
  );
}

async function MembersView() {
  const db = await getDb();
  const rows = await db.query.memberProfiles.findMany({ orderBy: [desc(schema.memberProfiles.createdAt)], limit: 100, with: { user: { columns: { email: true, role: true } } } });
  return (
    <Rows>
      {rows.map((m) => (
        <Row
          key={m.id}
          actions={
            <form action={moderateMember} className="flex gap-1.5">
              <input type="hidden" name="userId" value={m.userId} />
              <Button size="sm" variant="outline" type="submit" name="action" value={m.isVerified ? "unverify" : "verify"}>
                {m.isVerified ? "Unverify" : "Verify member"}
              </Button>
              <Button size="sm" variant="ghost" type="submit" name="action" value={m.isBanned ? "unban" : "ban"}>
                {m.isBanned ? "Unban" : "Ban"}
              </Button>
            </form>
          }
        >
          <p className="flex flex-wrap items-center gap-2">
            <Link href={`/u/${m.handle}`} target="_blank" className="font-medium underline-offset-4 hover:underline">
              {m.displayName}
            </Link>
            <span className="text-[13px] text-3">@{m.handle}</span>
            {m.isVerified ? <Badge tone="success">verified</Badge> : null}
            {m.isBanned ? <Badge tone="danger">banned</Badge> : null}
            {m.user.role !== "user" ? <Badge>{m.user.role.replace("_", " ")}</Badge> : null}
          </p>
          <p className="mt-0.5 text-[13px] text-2">
            {m.user.email} · joined {formatDate(m.createdAt)} · {m.postCount} posts · {m.commentCount} comments · {m.likesReceived} likes received
          </p>
        </Row>
      ))}
      {!rows.length ? <Empty>No members have posted or commented yet.</Empty> : null}
    </Rows>
  );
}
