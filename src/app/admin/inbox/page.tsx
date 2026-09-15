import Link from "next/link";
import { AdminPage, Empty, FilterTabs, Row, Rows, Status, SubFilter, Toolbar } from "@/components/admin";
import { Alert, Button } from "@/components/ui";
import { formatDate, timeAgo } from "@/lib/format";
import { INBOX_STATUSES, inboxCounts, inboxEnabled, listInbox } from "@/lib/inbox";
import { cn } from "@/lib/utils";
import { setInboxStatusAction, syncInboxAction } from "./actions";

export const dynamic = "force-dynamic";

function href(p: { status?: string; mailbox?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (p.status && p.status !== "new") qs.set("status", p.status);
  if (p.mailbox) qs.set("mailbox", p.mailbox);
  if (p.q) qs.set("q", p.q);
  const s = qs.toString();
  return `/admin/inbox${s ? `?${s}` : ""}`;
}

export default async function AdminInbox({ searchParams }: { searchParams: Promise<{ status?: string; mailbox?: string; q?: string; synced?: string; note?: string }> }) {
  const { status = "new", mailbox, q, synced, note } = await searchParams;
  const [rows, counts] = await Promise.all([listInbox({ status, mailbox, q }), inboxCounts()]);
  return (
    <AdminPage
      title="Inbox"
      description="Everything sent to an @searchable.pk address. Replies go out from the same address, threaded, and count against the daily email allowance."
      actions={
        <form action={syncInboxAction}>
          <Button size="sm" variant="outline" type="submit" disabled={!inboxEnabled()}>
            Sync now
          </Button>
        </form>
      }
    >
      {!inboxEnabled() ? (
        <Alert tone="warning" className="mb-4">
          Receiving needs EMAIL_PROVIDER=resend and a RESEND_API_KEY with full access. Locally the inbox only shows what has already been mirrored.
        </Alert>
      ) : null}
      {synced !== undefined ? (
        <Alert tone={note ? "warning" : "success"} className="mb-4">
          {note ? `Sync stopped: ${note}` : `Synced. ${synced} new message${synced === "1" ? "" : "s"}.`}
        </Alert>
      ) : null}
      <FilterTabs items={INBOX_STATUSES.map((s) => ({ href: href({ status: s, mailbox, q }), label: s, count: counts.status(s), active: status === s }))} />
      <Toolbar search={{ placeholder: "Search sender, subject", defaultValue: q, hidden: { status: status !== "new" ? status : undefined, mailbox } }}>
        {counts.mailboxes.length > 1 ? (
          <SubFilter label="Mailbox:" items={[{ href: href({ status, q }), label: "All", active: !mailbox }, ...counts.mailboxes.map((m) => ({ href: href({ status, q, mailbox: m.mailbox }), label: `${m.mailbox}@ (${m.n})`, active: mailbox === m.mailbox }))]} />
        ) : null}
      </Toolbar>
      {rows.length === 0 ? (
        <Empty>{status === "new" ? "No new mail." : "Nothing here."}</Empty>
      ) : (
        <Rows>
          {rows.map((m) => (
            <Row
              key={m.id}
              actions={
                <>
                  {m.status !== "archived" ? (
                    <form action={setInboxStatusAction.bind(null, m.id, "archived")}>
                      <Button size="sm" variant="ghost" type="submit">
                        Archive
                      </Button>
                    </form>
                  ) : (
                    <form action={setInboxStatusAction.bind(null, m.id, "new")}>
                      <Button size="sm" variant="ghost" type="submit">
                        Restore
                      </Button>
                    </form>
                  )}
                </>
              }
            >
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link href={`/admin/inbox/${m.id}`} className={cn("underline-offset-4 hover:underline", !m.readAt && "font-semibold")}>
                  {m.subject}
                </Link>
                <Status value={m.status} />
                {m.attachments.length ? <span className="text-[12px] text-3">{m.attachments.length} attachment{m.attachments.length === 1 ? "" : "s"}</span> : null}
              </p>
              <p className="text-[13.5px] text-2">
                {m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress} → {m.mailbox}@ · <time dateTime={m.receivedAt.toISOString()} title={formatDate(m.receivedAt, { dateStyle: "medium", timeStyle: "short" })}>{timeAgo(m.receivedAt)}</time>
              </p>
              <p className="mt-1 line-clamp-2 max-w-3xl text-[14px] text-2">{m.snippet}</p>
            </Row>
          ))}
        </Rows>
      )}
    </AdminPage>
  );
}
