"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button, Textarea } from "@/components/ui";
import { authHintUserId, hasAuthHint } from "@/lib/auth-hint";
import { addComment, deleteOwnComment, reportContent } from "@/lib/community-actions";
import { cn } from "@/lib/utils";

const subscribeNoop = () => () => {};

/** Comment or reply box. Shows a sign-in prompt to anonymous readers; never asks the server who they are. */
export function CommentForm({ targetType, targetId, parentId, path, placeholder = "Add a comment", compact, onDone }: { targetType: "post" | "article"; targetId: string; parentId?: string; path: string; placeholder?: string; compact?: boolean; onDone?: () => void }) {
  const router = useRouter();
  const mounted = React.useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState("");
  if (!mounted) return null;
  if (!hasAuthHint()) {
    return (
      <p className={cn("text-[14px] text-2", compact && "text-[13px]")}>
        <Link href={`/login?next=${encodeURIComponent(path)}`} className="font-medium text-[var(--text)] underline underline-offset-4">
          Sign in
        </Link>{" "}
        to {parentId ? "reply" : "comment"}. Real names, no links from new accounts, and we remove abuse.
      </p>
    );
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        setNote("");
        const res = await addComment({ targetType, targetId, parentId, body, path });
        setBusy(false);
        if (!res.ok) {
          setNote(res.error ?? "Could not post");
          return;
        }
        setBody("");
        setNote(res.error ?? "");
        onDone?.();
        router.refresh();
      }}
      className="space-y-2"
    >
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} maxLength={3000} required className={cn(compact ? "min-h-16 text-[14px]" : "min-h-20")} />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={busy || !body.trim()}>
          {busy ? "Posting…" : parentId ? "Reply" : "Comment"}
        </Button>
        {onDone ? (
          <button type="button" onClick={onDone} className="text-[13px] text-2 underline-offset-4 hover:underline">
            Cancel
          </button>
        ) : null}
        {note ? <span className="text-[13px] text-2">{note}</span> : null}
      </div>
    </form>
  );
}

/** Per-comment actions that need the reader: reply, delete own, report. */
export function CommentActions({ commentId, authorId, targetType, targetId, path, canReply }: { commentId: string; authorId: string; targetType: "post" | "article"; targetId: string; path: string; canReply: boolean }) {
  const router = useRouter();
  const [replying, setReplying] = React.useState(false);
  const [reporting, setReporting] = React.useState(false);
  const [done, setDone] = React.useState("");
  const mounted = React.useSyncExternalStore(subscribeNoop, () => true, () => false);
  if (!mounted) return null;
  const mine = authHintUserId() === authorId;
  return (
    <div className="mt-1.5 text-[12.5px]">
      <div className="flex flex-wrap items-center gap-x-3">
        {canReply ? (
          <button type="button" onClick={() => setReplying((v) => !v)} className="text-2 underline-offset-4 hover:underline">
            Reply
          </button>
        ) : null}
        {mine ? (
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Delete this comment?")) return;
              const res = await deleteOwnComment(commentId, path);
              if (res.ok) router.refresh();
              else setDone(res.error ?? "");
            }}
            className="text-3 underline-offset-4 hover:underline"
          >
            Delete
          </button>
        ) : null}
        <button type="button" onClick={() => setReporting((v) => !v)} className="text-3 underline-offset-4 hover:underline">
          Report
        </button>
        {done ? <span className="text-2">{done}</span> : null}
      </div>
      {replying ? (
        <div className="mt-2 max-w-xl">
          <CommentForm targetType={targetType} targetId={targetId} parentId={commentId} path={path} placeholder="Write a reply" compact onDone={() => setReplying(false)} />
        </div>
      ) : null}
      {reporting ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const res = await reportContent({ targetType: "comment", targetId: commentId, reason: String(fd.get("reason")) as "spam", details: String(fd.get("details") ?? "") });
            setReporting(false);
            setDone(res.ok ? "Reported, thank you." : res.error ?? "");
          }}
          className="mt-2 flex flex-wrap items-center gap-2"
        >
          <select name="reason" aria-label="Reason" className="h-8 border border-line bg-surface px-2 text-[13px]">
            <option value="spam">Spam</option>
            <option value="scam">Scam or fraud</option>
            <option value="abuse">Abuse or harassment</option>
            <option value="wrong">Wrong or misleading</option>
            <option value="other">Other</option>
          </select>
          <input name="details" aria-label="Details" placeholder="Anything to add (optional)" maxLength={600} className="h-8 w-56 border border-line bg-surface px-2 text-[13px]" />
          <Button type="submit" size="sm" variant="outline">
            Send
          </Button>
        </form>
      ) : null}
    </div>
  );
}
