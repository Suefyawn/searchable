import Link from "next/link";
import { Badge } from "@/components/ui";
import { hasRole, requireUser } from "@/lib/auth";
import { SignOutButton } from "./sign-out";

export const metadata = { title: "Your account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <div className="container-x py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{user.name}</h1>
            <p className="text-2">{user.email}</p>
            <Badge tone="brand" className="mt-2 capitalize">
              {user.role.replace("_", " ")}
            </Badge>
          </div>
          <SignOutButton />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {hasRole(user, "editor") ? (
            <Link href="/admin" className="surface surface-hover p-5">
              <p className="font-semibold">Admin</p>
              <p className="mt-1 text-[15px] text-2">Publish articles, manage businesses, view subscribers and search logs.</p>
            </Link>
          ) : null}
          <Link href="/account/profile" className="surface surface-hover p-5">
            <p className="font-semibold">Your public profile</p>
            <p className="mt-1 text-[15px] text-2">Handle, photo, bio and handles shown on your posts and comments.</p>
          </Link>
          <Link href="/account/saved" className="surface surface-hover p-5">
            <p className="font-semibold">Saved</p>
            <p className="mt-1 text-[15px] text-2">Articles, calculators, listings, profiles and posts you bookmarked.</p>
          </Link>
          <Link href="/account/notifications" className="surface surface-hover p-5">
            <p className="font-semibold">Email notifications</p>
            <p className="mt-1 text-[15px] text-2">Enquiries, outbid alerts and the daily activity digest: on or off, each one.</p>
          </Link>
          <Link href="/account/posts" className="surface surface-hover p-5">
            <p className="font-semibold">Your posts</p>
            <p className="mt-1 text-[15px] text-2">Jobs, listings, auctions and questions you have posted, and their status.</p>
          </Link>
          <Link href="/professional" className="surface surface-hover p-5">
            <p className="font-semibold">Professional profile</p>
            <p className="mt-1 text-[15px] text-2">Doctor, engineer, electrician, tutor: a profile people can hire you from.</p>
          </Link>
          <Link href="/business" className="surface surface-hover p-5">
            <p className="font-semibold">Your businesses</p>
            <p className="mt-1 text-[15px] text-2">Manage listings you own: details, hours, services, enquiries and review responses.</p>
          </Link>
          <div className="surface p-5">
            <p className="font-semibold">Newsletter</p>
            <p className="mt-1 text-[15px] text-2">
              Manage topics on the <Link href="/newsletter" className="text-brand-700 underline dark:text-brand-300">newsletter page</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
