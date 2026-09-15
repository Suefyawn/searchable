import { PostForm } from "@/components/community/post-form";
import { SectionHeader } from "@/components/ui";
import { hasRole, requireUser } from "@/lib/auth";
import { professionalEditorOptions } from "@/lib/professional-editor-data";
import { POST_KINDS, type PostKindKey } from "@/lib/community-schema";

export const metadata = { title: "New post", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const user = await requireUser(`/community/new${kind ? `?kind=${kind}` : ""}`);
  const { cities } = await professionalEditorOptions();
  const k = POST_KINDS.find((x) => x.key === kind)?.key as PostKindKey | undefined;
  return (
    <div className="container-x py-8 sm:py-10">
      <SectionHeader as="h1" title="Post something" description="A job, something to sell, an auction, a question or a discussion. Free. An editor checks it before it appears; you get an email when it is live." />
      <PostForm initial={{ kind: k ?? "discussion", images: [], negotiable: false }} cities={cities} isEditor={hasRole(user, "editor")} />
    </div>
  );
}
