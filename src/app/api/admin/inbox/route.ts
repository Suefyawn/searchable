import { z } from "zod";
import { ApiError, qs, withAdminApi } from "@/lib/admin-api";
import { fetchInboxHtml, getInboxMessage, listInbox, markInboxRead, replyToInboxMessage, setInboxStatus, syncInbox } from "@/lib/inbox";

export const dynamic = "force-dynamic";

/** GET /api/admin/inbox?status=new|replied|archived|all&mailbox=&q=&limit=  or  ?id=<message id> for one message with its text. */
export const GET = withAdminApi(async (req) => {
  const q = qs(req);
  const id = q.str("id");
  if (id) {
    const m = await getInboxMessage(id);
    if (!m) throw new ApiError(404, "No such message");
    const html = q.str("html") === "1" && m.hasHtml ? await fetchInboxHtml(id).catch(() => null) : undefined;
    return { message: { ...m, ...(html !== undefined ? { html } : {}) } };
  }
  const rows = await listInbox({ status: q.str("status", "new"), mailbox: q.str("mailbox"), q: q.str("q"), limit: q.int("limit", 50, 200) });
  return { messages: rows.map(({ text: _text, ...m }) => m) };
});

const Body = z.union([
  z.object({ id: z.string().min(1), reply: z.string().trim().min(2).max(20_000) }),
  z.object({ id: z.string().min(1), status: z.enum(["new", "replied", "archived"]) }),
  z.object({ id: z.string().min(1), read: z.literal(true) }),
  z.object({ sync: z.literal(true) }),
]);

/**
 * POST /api/admin/inbox
 *   { id, reply }               send a reply from the mailbox the mail arrived at (threaded, quoted)
 *   { id, status: "archived" }  set status
 *   { id, read: true }          mark read
 *   { sync: true }              pull anything the webhook missed
 */
export const POST = withAdminApi(async (_req, { user, body }) => {
  const d = Body.parse(body);
  if ("sync" in d) return { ok: true, ...(await syncInbox()) };
  if ("reply" in d) {
    const sent = await replyToInboxMessage(d.id, d.reply, user.name);
    return { ok: true, sentId: sent.id };
  }
  if ("status" in d) {
    await setInboxStatus(d.id, d.status);
    return { ok: true };
  }
  await markInboxRead(d.id);
  return { ok: true };
});
