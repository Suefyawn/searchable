"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { deleteIssueAction, saveIssueAction, sendNowAction, sendTestAction } from "../actions";

type Issue = { id: string; subject: string; preheader: string | null; body: string; frequency: "daily" | "weekly"; status: string; scheduledFor: Date | null; recipientCount: number };

function toLocalInput(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function IssueEditor({ issue, previewHtml, userEmail, isAdmin, activeCount }: { issue: Issue; previewHtml: string; userEmail: string; isAdmin: boolean; activeCount: number }) {
  const [subject, setSubject] = useState(issue.subject);
  const [preheader, setPreheader] = useState(issue.preheader ?? "");
  const [body, setBody] = useState(issue.body);
  const [frequency, setFrequency] = useState(issue.frequency);
  const [scheduledFor, setScheduledFor] = useState(toLocalInput(issue.scheduledFor));
  const [msg, setMsg] = useState<{ tone: "success" | "danger" | "neutral"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const sent = issue.status === "sent";

  function buildForm(intent: "save" | "schedule" | "unschedule") {
    const fd = new FormData();
    fd.set("id", issue.id);
    fd.set("subject", subject);
    fd.set("preheader", preheader);
    fd.set("body", body);
    fd.set("frequency", frequency);
    fd.set("scheduledFor", scheduledFor);
    fd.set("intent", intent);
    return fd;
  }

  function submit(intent: "save" | "schedule" | "unschedule") {
    start(async () => {
      const r = await saveIssueAction(buildForm(intent));
      setMsg(r.error ? { tone: "danger", text: r.error } : { tone: "success", text: intent === "schedule" ? "Scheduled." : intent === "unschedule" ? "Back to draft." : "Saved. Reload the preview tab to see changes." });
    });
  }

  function sendTest() {
    start(async () => {
      const saved = await saveIssueAction(buildForm(issue.status === "scheduled" ? "schedule" : "save"));
      if (saved.error) return setMsg({ tone: "danger", text: saved.error });
      const fd = new FormData();
      fd.set("id", issue.id);
      fd.set("to", userEmail);
      const r = await sendTestAction(fd);
      setMsg({ tone: "success", text: `Test sent to ${r.to}. Local provider writes it to .data/outbox.` });
    });
  }

  function sendNow() {
    const confirm = window.prompt(`This sends "${subject}" to ${activeCount} active ${frequency} subscriber${activeCount === 1 ? "" : "s"}. Type SEND to confirm.`);
    if (confirm !== "SEND") return;
    const fd = new FormData();
    fd.set("id", issue.id);
    fd.set("confirm", "SEND");
    start(async () => {
      const r = await sendNowAction(fd);
      setMsg(r.error ? { tone: "danger", text: r.error } : { tone: "success", text: `Sent to ${"sent" in r ? r.sent : 0} subscribers${"failures" in r && r.failures?.length ? `; ${r.failures.length} failed` : ""}.` });
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <div className="mb-4 flex gap-1 border-b border-line text-sm">
          <button type="button" onClick={() => setTab("edit")} className={`px-3 py-2 ${tab === "edit" ? "border-b-2 border-[var(--text)] font-medium" : "text-2"}`}>Edit</button>
          <button type="button" onClick={() => setTab("preview")} className={`px-3 py-2 ${tab === "preview" ? "border-b-2 border-[var(--text)] font-medium" : "text-2"}`}>Preview (last saved)</button>
        </div>
        {msg ? <Alert tone={msg.tone} className="mb-4">{msg.text}</Alert> : null}
        {tab === "edit" ? (
          <div className="space-y-4">
            <Field label="Subject" help={`${subject.length}/160: the headline story usually works`}>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={sent} maxLength={160} />
            </Field>
            <Field label="Preheader" help="Shown after the subject in inboxes; the day's numbers by default">
              <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} disabled={sent} maxLength={200} />
            </Field>
            <Field label="Body (Markdown)" help="## sections, ### story headlines with links, - bullet numbers. Links must be absolute.">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} disabled={sent} className="min-h-[520px] font-mono text-[13.5px] leading-relaxed" />
            </Field>
          </div>
        ) : (
          <iframe title="Email preview" srcDoc={previewHtml} className="h-[900px] w-full border border-line bg-white" sandbox="" />
        )}
      </div>

      <aside className="space-y-4 self-start lg:sticky lg:top-20">
        <div className="border border-line p-4 text-sm">
          <p className="eyebrow">Status</p>
          <p className="mt-1 text-lg font-medium capitalize">{issue.status}</p>
          {sent ? <p className="text-2">Sent to {issue.recipientCount} subscribers.</p> : null}
          <label className="mt-3 block text-xs text-3">
            Audience
            <select value={frequency} onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")} disabled={sent} className="mt-1 block h-9 w-full border border-line bg-surface px-2 text-sm">
              <option value="daily">Daily subscribers</option>
              <option value="weekly">Weekly subscribers</option>
            </select>
          </label>
        </div>

        {!sent ? (
          <div className="space-y-2 border border-line p-4 text-sm">
            <Button size="sm" className="w-full" onClick={() => submit("save")} disabled={pending}>Save draft</Button>
            <Button size="sm" variant="secondary" className="w-full" onClick={sendTest} disabled={pending}>Send test to {userEmail}</Button>
            <label className="block pt-2 text-xs text-3">
              Schedule for (Pakistan time)
              <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="mt-1 block h-9 w-full border border-line bg-surface px-2 text-sm" />
            </label>
            {issue.status === "scheduled" ? (
              <Button size="sm" variant="outline" className="w-full" onClick={() => submit("unschedule")} disabled={pending}>Cancel schedule</Button>
            ) : (
              <Button size="sm" variant="outline" className="w-full" onClick={() => submit("schedule")} disabled={pending || !scheduledFor}>Schedule</Button>
            )}
            {isAdmin ? (
              <Button size="sm" variant="danger" className="w-full" onClick={sendNow} disabled={pending}>Send now to {activeCount}</Button>
            ) : (
              <p className="text-xs text-3">Only admins can send.</p>
            )}
          </div>
        ) : null}

        {isAdmin && !sent ? (
          <form action={deleteIssueAction} onSubmit={(e) => (window.confirm("Delete this issue?") ? undefined : e.preventDefault())}>
            <input type="hidden" name="id" value={issue.id} />
            <Button size="sm" variant="ghost" type="submit" className="w-full">Delete issue</Button>
          </form>
        ) : null}
      </aside>
    </div>
  );
}
