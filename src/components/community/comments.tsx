import Link from "next/link";
import { listComments, type CommentRow } from "@/lib/community";
import { timeAgo } from "@/lib/format";
import { CommentActions, CommentForm } from "./comment-form";
import { LikeButton } from "./like-button";
import { LikedProvider } from "./liked-context";

/**
 * Comments under a post or article. Rendered on the server from the database (cached with the page),
 * with client islands for the form, likes, replies and reports. `extraTargets` lets the page include its own
 * like target (the post or article itself) in the single likes lookup.
 */
export async function CommentsSection({ targetType, targetId, path, title = "Comments", extraTargets = [] }: { targetType: "post" | "article"; targetId: string; path: string; title?: string; extraTargets?: { type: "post" | "article"; id: string }[] }) {
  const comments = await listComments(targetType, targetId);
  const all: CommentRow[] = comments.flatMap((c) => [c, ...c.replies]);
  const targets = [...extraTargets, ...all.map((c) => ({ type: "comment" as const, id: c.id }))];
  const count = all.length;
  return (
    <LikedProvider targets={targets}>
      <section id="comments" className="mt-12 border-t-2 border-[var(--rule)] pt-6" aria-label={title}>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="eyebrow">
            {title} <span className="ml-1 font-sans text-[12px] font-normal normal-case tracking-normal text-3">{count}</span>
          </h2>
        </div>
        <div className="max-w-2xl">
          <CommentForm targetType={targetType} targetId={targetId} path={path} />
        </div>
        {comments.length ? (
          <ol className="mt-6 max-w-3xl divide-y divide-[var(--border)]">
            {comments.map((c) => (
              <li key={c.id} className="py-4">
                <Comment c={c} targetType={targetType} targetId={targetId} path={path} canReply />
                {c.replies.length ? (
                  <ol className="mt-3 space-y-3 border-l border-line pl-4">
                    {c.replies.map((r) => (
                      <li key={r.id}>
                        <Comment c={r} targetType={targetType} targetId={targetId} path={path} canReply={false} />
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-6 text-[14px] text-3">No comments yet. Say something useful.</p>
        )}
      </section>
    </LikedProvider>
  );
}

function Comment({ c, targetType, targetId, path, canReply }: { c: CommentRow; targetType: "post" | "article"; targetId: string; path: string; canReply: boolean }) {
  return (
    <article className="text-[14.5px]">
      <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-3">
        {c.handle ? (
          <Link href={`/u/${c.handle}`} className="font-medium text-[var(--text)] underline-offset-4 hover:underline">
            {c.author.name}
          </Link>
        ) : (
          <span className="font-medium text-[var(--text)]">{c.author.name}</span>
        )}
        <time dateTime={c.createdAt.toISOString()}>{timeAgo(c.createdAt)}</time>
        {c.editedAt ? <span>edited</span> : null}
      </p>
      <p className="mt-1 whitespace-pre-line leading-relaxed">{c.body}</p>
      <div className="mt-1.5 flex items-center gap-4">
        <LikeButton type="comment" id={c.id} count={c.likeCount} size="sm" />
        <CommentActions commentId={c.id} authorId={c.authorId} targetType={targetType} targetId={targetId} path={path} canReply={canReply} />
      </div>
    </article>
  );
}
