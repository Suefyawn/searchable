import Link from "next/link";
import { Badge, SectionHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { kindLabel, listPosts } from "@/lib/community";
import { closePost } from "@/lib/community-actions";

async function closeAction(id: string) {
  "use server";
  await closePost(id);
}
import { formatDate } from "@/lib/format";

export const metadata = { title: "Your posts", robots: { index: false } };
export const dynamic = "force-dynamic";

const TONE = { published: "success", pending: "warning", rejected: "danger", hidden: "neutral", closed: "neutral" } as const;

export default async function MyPostsPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const { submitted } = await searchParams;
  const user = await requireUser("/account/posts");
  const { rows } = await listPosts({ authorId: user.id, status: "all", limit: 100 });
  return (
    <div className="container-x max-w-4xl py-10">
      <p className="mb-3 text-sm">
        <Link href="/account" className="text-2 underline-offset-4 hover:underline">
          ← Your account
        </Link>
      </p>
      <SectionHeader as="h1" title="Your posts" description="Pending posts are checked by an editor, usually within a few hours; you get an email when one goes live." href="/community/new" hrefLabel="New post" />
      {submitted ? <p className="mb-6 border-y-2 border-[var(--rule)] py-3 text-[15px]">Thanks. Your post is in the queue; we will email you when it is live.</p> : null}
      {rows.length ? (
        <ul className="divide-y divide-[var(--border)] border-y border-line">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  {p.status === "published" || p.status === "closed" ? (
                    <Link href={`/community/post/${p.slug}`} className="font-medium underline-offset-4 hover:underline">
                      {p.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{p.title}</span>
                  )}
                  <Badge tone={TONE[p.status]}>{p.status}</Badge>
                </p>
                <p className="mt-0.5 text-[13px] text-3">
                  {kindLabel(p.kind)} · {formatDate(p.createdAt)} · {p.likeCount} likes · {p.commentCount} comments
                  {p.moderationNote ? ` · Editor: ${p.moderationNote}` : ""}
                </p>
              </div>
              <div className="flex gap-2 text-[13.5px]">
                <Link href={`/community/post/${p.slug}/edit`} className="underline-offset-4 hover:underline">
                  Edit
                </Link>
                {p.status === "published" ? (
                  <form action={closeAction.bind(null, p.id)}>
                    <button type="submit" className="text-2 underline-offset-4 hover:underline">
                      Close
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-y border-line py-10 text-center text-[15px] text-2">
          You have not posted yet.{" "}
          <Link href="/community/new" className="underline underline-offset-4">
            Post something
          </Link>
          .
        </p>
      )}
    </div>
  );
}
