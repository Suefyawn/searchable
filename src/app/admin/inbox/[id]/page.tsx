import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage, Details, Status } from "@/components/admin";
import { Button } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { fetchInboxHtml, getInboxMessage, INBOX_DOMAIN, markInboxRead, parseAddress } from "@/lib/inbox";
import { setInboxStatusAction } from "../actions";
import { ReplyForm } from "./reply-form";

export const dynamic = "force-dynamic";

function bytes(n: number) {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default async function InboxMessagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params;
  const { view } = await searchParams;
  const m = await getInboxMessage(id);
  if (!m) notFound();
  await markInboxRead(id);
  // HTML is fetched only on request: the plain text is enough for most mail and costs no API call.
  const showHtml = view === "html" && m.hasHtml === 1;
  const html = showHtml ? await fetchInboxHtml(id).catch(() => null) : null;
  const replyTo = m.replyTo[0] ? parseAddress(m.replyTo[0]).address : m.fromAddress;
  const domain = INBOX_DOMAIN;
  return (
    <AdminPage
      title={m.subject}
      description={
        <>
          <Link href="/admin/inbox" className="underline underline-offset-4">
            Inbox
          </Link>{" "}
          · {m.mailbox}@{domain} <Status value={m.status} className="ml-1" />
        </>
      }
      actions={
        <>
          {m.status !== "archived" ? (
            <form action={setInboxStatusAction.bind(null, m.id, "archived")}>
              <Button size="sm" variant="outline" type="submit">
                Archive
              </Button>
            </form>
          ) : (
            <form action={setInboxStatusAction.bind(null, m.id, "new")}>
              <Button size="sm" variant="outline" type="submit">
                Restore
              </Button>
            </form>
          )}
          {m.status === "new" ? (
            <form action={setInboxStatusAction.bind(null, m.id, "replied")}>
              <Button size="sm" variant="ghost" type="submit">
                Mark replied
              </Button>
            </form>
          ) : null}
        </>
      }
    >
      <Details
        items={[
          { label: "From", value: m.fromName ? `${m.fromName} <${m.fromAddress}>` : m.fromAddress },
          { label: "To", value: m.to.join(", ") },
          { label: "Cc", value: m.cc.join(", ") },
          { label: "Reply to", value: m.replyTo.join(", ") },
          { label: "Received", value: formatDate(m.receivedAt, { dateStyle: "full", timeStyle: "short" }) },
          { label: "Replied", value: m.repliedAt ? formatDate(m.repliedAt, { dateStyle: "medium", timeStyle: "short" }) : null },
          {
            label: "Attachments",
            value: m.attachments.length ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {m.attachments.map((a) => (
                  <li key={a.id}>
                    <a href={`/admin/inbox/${m.id}/attachments/${a.id}`} className="underline underline-offset-4" rel="noreferrer">
                      {a.filename}
                    </a>{" "}
                    <span className="text-[12.5px] text-3">{bytes(a.size)}</span>
                  </li>
                ))}
              </ul>
            ) : null,
          },
        ]}
      />
      <div className="mt-6 border-t border-line pt-4">
        {m.hasHtml === 1 ? (
          <p className="mb-3 text-[13px] text-3">
            {showHtml ? (
              <Link href={`/admin/inbox/${m.id}`} className="underline underline-offset-4">
                Show plain text
              </Link>
            ) : (
              <Link href={`/admin/inbox/${m.id}?view=html`} className="underline underline-offset-4">
                Show HTML version
              </Link>
            )}
          </p>
        ) : null}
        {showHtml ? (
          html ? (
            // Sandboxed: no scripts, no forms, no navigation. Remote images still load; that is the sender's tracking pixel, same as any client.
            <iframe title="Message" srcDoc={html} sandbox="" className="h-[70vh] w-full border border-line bg-white" />
          ) : (
            <p className="text-[15px] text-2">The HTML version could not be fetched from Resend.</p>
          )
        ) : (
          <pre className="max-w-[72ch] whitespace-pre-wrap font-sans text-[15.5px] leading-relaxed">{m.text ?? m.snippet}</pre>
        )}
      </div>
      <div className="mt-8">
        <ReplyForm id={m.id} to={replyTo} from={`${m.mailbox}@${domain}`} />
      </div>
    </AdminPage>
  );
}
