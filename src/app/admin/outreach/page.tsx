import Link from "next/link";
import { AdminPage, Section, Stat, Table, TBody, Td, THead, EmptyRow } from "@/components/admin";
import { Button } from "@/components/ui";
import { eligibleForInvite, outreachStats } from "@/lib/claims";
import { emailAllowance } from "@/lib/email";
import { formatDate, timeAgo } from "@/lib/format";
import { sendBatchNow, sendPreview, toggleOutreach } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Claim outreach: invite every listed business with an email address to claim its listing, a batch a day
 * within the email budget, with one reminder after 14 days and a one-click opt-out.
 */
export default async function AdminOutreach() {
  const [stats, allowance, next] = await Promise.all([outreachStats(), emailAllowance("bulk"), eligibleForInvite(25)]);
  const rate = stats.invited ? Math.round((stats.claimed / stats.invited) * 100) : 0;

  return (
    <AdminPage
      title="Claim outreach"
      description="List them, then ask them. Each business with an email gets a personal claim link (no code needed), a reminder two weeks later if it stays unclaimed, and never a third email."
      actions={
        <form action={toggleOutreach}>
          <input type="hidden" name="enabled" value={stats.enabled ? "0" : "1"} />
          <Button type="submit" variant={stats.enabled ? "outline" : "primary"} size="sm">
            {stats.enabled ? "Pause daily sending" : "Start daily sending"}
          </Button>
        </form>
      }
    >
      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active listings" value={stats.active.toLocaleString()} hint={`${stats.withEmail.toLocaleString()} with an email address`} />
        <Stat label="Invited" value={stats.invited.toLocaleString()} hint={`${stats.optedOut} opted out`} />
        <Stat label="Claimed" value={stats.claimed.toLocaleString()} hint={stats.invited ? `${rate}% of invited` : "none invited yet"} href="/admin/claims?status=approved" />
        <Stat label="Waiting to be invited" value={stats.eligible.toLocaleString()} hint={`${allowance.today} emails left today`} />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Section title="Next in line" description="Best-known listings first (reviews, then views). Sent automatically each day when sending is on.">
          <Table>
            <THead cols={["Business", "Email", "City", "Round", "Last invite"]} />
            <TBody>
              {next.map((b) => (
                <tr key={b.id}>
                  <Td>
                    <Link href={`/b/${b.slug}`} className="hover:underline underline-offset-4" target="_blank">
                      {b.name}
                    </Link>
                  </Td>
                  <Td muted>{b.email}</Td>
                  <Td muted>{b.city?.name}</Td>
                  <Td muted>{b.claimInviteCount ? "Reminder" : "First"}</Td>
                  <Td muted>{b.claimInviteSentAt ? formatDate(b.claimInviteSentAt) : "never"}</Td>
                </tr>
              ))}
              {!next.length ? <EmptyRow colSpan={5}>Everyone with an email has been invited. Import more businesses with email addresses to keep going.</EmptyRow> : null}
            </TBody>
          </Table>
        </Section>
        <aside className="space-y-8 text-[14.5px]">
          <Section title="Status">
            <ul className="space-y-1.5 text-2">
              <li>Daily sending: <strong className="text-[var(--text)]">{stats.enabled ? "on" : "off"}</strong></li>
              <li>Last run: {stats.lastRun ? `${timeAgo(stats.lastRun)}, ${stats.lastSent} sent` : "never"}</li>
              <li>Budget: {allowance.today} today, {allowance.month.toLocaleString()} this month</li>
            </ul>
          </Section>
          <Section title="Send a batch now">
            <form action={sendBatchNow} className="flex items-center gap-2">
              <input name="limit" type="number" min={1} max={100} defaultValue={20} className="h-9 w-20 border border-line bg-surface px-2 text-sm outline-none focus:border-ink-500" aria-label="How many" />
              <Button size="sm" type="submit">Send</Button>
            </form>
            <p className="mt-2 text-[13px] text-3">Capped by today&rsquo;s email allowance.</p>
          </Section>
          <Section title="Preview the email">
            <form action={sendPreview} className="flex items-center gap-2">
              <input name="to" type="email" placeholder="you@…" className="h-9 flex-1 border border-line bg-surface px-2 text-sm outline-none focus:border-ink-500" aria-label="Send preview to" />
              <Button size="sm" variant="outline" type="submit">Send</Button>
            </form>
            <p className="mt-2 text-[13px] text-3">Sends the next listing&rsquo;s invite to you, marked PREVIEW.</p>
          </Section>
          <Section title="Beyond the free email plan">
            <p className="text-2">At 90 invites a day, 1,000 listings take eleven days. To go faster, export the eligible list from Businesses and send from a list tool, then paste the same claim link format.</p>
          </Section>
        </aside>
      </div>
    </AdminPage>
  );
}
