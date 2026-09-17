import Link from "next/link";
import { SectionHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ensureMemberProfile, getMemberByUser } from "@/lib/community";
import { professionalEditorOptions } from "@/lib/professional-editor-data";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Your public profile", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const user = await requireUser("/account/profile");
  const m = (await getMemberByUser(user.id)) ?? (await ensureMemberProfile(user));
  const { cities } = await professionalEditorOptions();
  return (
    <div className="container-x max-w-4xl py-10">
      <p className="mb-3 text-sm">
        <Link href="/account" className="text-2 underline-offset-4 hover:underline">
          ← Your account
        </Link>
      </p>
      <SectionHeader as="h1" title="Your public profile" description="How you appear on posts and comments." href={m.isPublic ? `/u/${m.handle}` : undefined} hrefLabel="View profile" />
      <p className="mb-8 border-y border-line py-3 text-[14.5px] text-2">
        Which emails you get (enquiries, outbid alerts, the daily activity digest) is set on <Link href="/account/notifications" className="underline underline-offset-4">Email notifications</Link>.
      </p>
      <ProfileForm initial={{ handle: m.handle, displayName: m.displayName, bio: m.bio ?? undefined, avatarUrl: m.avatarUrl ?? undefined, cityId: m.cityId ?? undefined, website: m.social.website, linkedin: m.social.linkedin, x: m.social.x, instagram: m.social.instagram, facebook: m.social.facebook, github: m.social.github, isPublic: m.isPublic }} cities={cities} />
    </div>
  );
}
