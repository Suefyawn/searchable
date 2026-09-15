import { eq } from "drizzle-orm";
import Link from "next/link";
import { SectionHeader } from "@/components/ui";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { NOTIFY_KINDS, prefOn } from "@/lib/notify";
import { NotificationToggles } from "./toggles";

export const metadata = { title: "Email notifications", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser("/account/notifications");
  const db = await getDb();
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { notificationPrefs: true } });
  const items = NOTIFY_KINDS.map((k) => ({ ...k, on: prefOn(row?.notificationPrefs, k.kind) }));
  return (
    <div className="container-x max-w-2xl py-8 sm:py-12">
      <p className="mb-4 text-[13.5px] text-3">
        <Link href="/account" className="underline underline-offset-4">
          Account
        </Link>
      </p>
      <SectionHeader as="h1" title="Email notifications" description={`Sent to ${user.email}. Sign-in codes, receipts and claim decisions always arrive; everything else is your choice.`} />
      <div className="mt-6">
        <NotificationToggles items={items} />
      </div>
      <p className="mt-6 text-[14px] text-2">
        The newsletter is separate: manage it from the link at the bottom of any issue or on the{" "}
        <Link href="/newsletter" className="underline underline-offset-4">
          newsletter page
        </Link>
        .
      </p>
    </div>
  );
}
