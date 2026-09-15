import Link from "next/link";
import { requireRole } from "@/lib/auth";

export const metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/ideas", label: "Story ideas" },
  { href: "/admin/businesses", label: "Businesses" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/data", label: "Data" },
  { href: "/admin/leads", label: "Leads & claims" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/submissions", label: "Submissions" },
  { href: "/admin/newsletter", label: "Newsletter" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/search-log", label: "Search log" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/redirects", label: "Redirects" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("editor", "/admin");
  return (
    <div className="container-x py-8">
      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 self-start">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-3">Admin</p>
          <nav className="mt-2 flex gap-1 overflow-x-auto lg:flex-col" aria-label="Admin">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-3 py-2 text-[15px] font-medium text-2 hover:bg-surface-2 hover:text-[var(--text)]">
                {n.label}
              </Link>
            ))}
          </nav>
          <p className="mt-6 px-3 text-xs text-3">
            {user.name} · {user.role}
          </p>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
