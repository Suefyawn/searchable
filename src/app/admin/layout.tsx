import { sql } from "drizzle-orm";
import Link from "next/link";
import { AdminNav, type AdminNavGroup } from "@/components/admin/nav";
import { getDb, rawQuery } from "@/db";
import { requireRole } from "@/lib/auth";
import { runDueJobs } from "@/lib/jobs";

export const metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Queue sizes for the sidebar badges: one query, cheap enough for every admin page load. */
async function queueCounts() {
  const db = await getDb();
  const [r] = await rawQuery<Record<string, number>>(
    db,
    sql`select
      (select count(*) from businesses where status = 'pending') as businesses,
      (select count(*) from business_claims where status = 'pending') as claims,
      (select count(*) from professionals where status = 'pending') as professionals,
      (select count(*) from posts where status = 'pending') as posts,
      (select count(*) from reports where status = 'open' and target_type in ('post', 'comment', 'member')) as community_reports,
      ((select count(*) from business_reviews where status = 'pending') + (select count(*) from professional_reviews where status = 'pending')) as reviews,
      (select count(*) from orders where status = 'pending') as orders,
      (select count(*) from submissions where status in ('new', 'reviewing')) as submissions,
      (select count(*) from messages where status = 'new') as messages,
      (select count(*) from inbox_messages where status = 'new' and read_at is null) as inbox,
      (select count(*) from reports where status = 'open') as reports,
      (select count(*) from articles where status = 'draft') as drafts`,
  );
  return r ?? {};
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("editor", "/admin");
  // An editor opening admin is a fine moment to publish anything that has come due (guarded to once per 5 minutes).
  void runDueJobs().catch(() => {});
  const c = await queueCounts();
  const groups: AdminNavGroup[] = [
    { title: "Desk", items: [{ href: "/admin", label: "Dashboard" }, { href: "/admin/articles", label: "Articles", count: c.drafts }, { href: "/admin/front-page", label: "Front page" }, { href: "/admin/ideas", label: "Story ideas" }, { href: "/admin/backlog", label: "Backlog" }, { href: "/admin/automation", label: "Automation" }, { href: "/admin/data", label: "Data hub" }, { href: "/admin/media", label: "Media" }] },
    { title: "Directory", items: [{ href: "/admin/businesses", label: "Businesses", count: c.businesses }, { href: "/admin/claims", label: "Claims", count: c.claims }, { href: "/admin/professionals", label: "Professionals", count: c.professionals }, { href: "/admin/outreach", label: "Outreach" }, { href: "/admin/reviews", label: "Reviews", count: c.reviews }, { href: "/admin/leads", label: "Enquiries" }] },
    { title: "Money", items: [{ href: "/admin/orders", label: "Orders", count: c.orders }, { href: "/admin/submissions", label: "Pitches", count: c.submissions }] },
    { title: "Community", items: [{ href: "/admin/community", label: "Moderation", count: (c.posts ?? 0) + (c.community_reports ?? 0) }] },
    { title: "Audience", items: [{ href: "/admin/newsletter", label: "Newsletter" }, { href: "/admin/subscribers", label: "Subscribers" }, { href: "/admin/search-log", label: "Search log" }, { href: "/admin/metrics", label: "Metrics" }, { href: "/admin/inbox", label: "Inbox", count: c.inbox }, { href: "/admin/messages", label: "Messages", count: c.messages }, { href: "/admin/reports", label: "Reports", count: c.reports }] },
    { title: "System", items: [{ href: "/admin/settings", label: "Settings" }, { href: "/admin/users", label: "Users" }, { href: "/admin/api-keys", label: "API keys" }, { href: "/admin/redirects", label: "Redirects" }, { href: "/admin/system", label: "Status" }] },
  ];
  return (
    <div className="container-x py-8">
      <div className="grid gap-8 lg:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="min-w-0 self-start lg:sticky lg:top-24">
          <div className="mb-4 flex items-baseline justify-between px-2">
            <p className="font-display text-lg">Admin</p>
            <Link href="/" className="text-[12.5px] text-3 hover:text-[var(--text)]">
              View site →
            </Link>
          </div>
          <AdminNav groups={groups} />
          <p className="mt-6 px-2 text-[12px] text-3">
            {user.name} · {user.role}
          </p>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
