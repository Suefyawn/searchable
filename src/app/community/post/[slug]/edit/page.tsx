import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PostForm } from "@/components/community/post-form";
import { SectionHeader } from "@/components/ui";
import { hasRole, requireUser } from "@/lib/auth";
import { getPost } from "@/lib/community";
import type { PostFormValues } from "@/lib/community-schema";
import { professionalEditorOptions } from "@/lib/professional-editor-data";

export const metadata = { title: "Edit post", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/community/post/${slug}/edit`);
  const p = await getPost(slug);
  if (!p) notFound();
  if (p.authorId !== user.id && !hasRole(user, "editor")) redirect(`/community/post/${slug}`);
  const { cities } = await professionalEditorOptions();
  return (
    <div className="container-x py-8 sm:py-10">
      <p className="mb-3 text-sm">
        <Link href="/account/posts" className="text-2 underline-offset-4 hover:underline">
          ← Your posts
        </Link>
      </p>
      <SectionHeader as="h1" title="Edit post" description={p.status === "rejected" ? `This post was not approved${p.moderationNote ? `: ${p.moderationNote}` : ""}. Fix it and save; it goes back in the queue.` : "Changes to a live post show within a few minutes."} />
      <PostForm initial={{ id: p.id, kind: p.kind, title: p.title, body: p.body, topic: p.topic ?? undefined, cityId: p.cityId ?? undefined, images: p.images, ...p.meta, employmentType: p.meta.employmentType as PostFormValues["employmentType"], condition: p.meta.condition as PostFormValues["condition"], negotiable: !!p.meta.negotiable }} cities={cities} isEditor={hasRole(user, "editor")} />
    </div>
  );
}
