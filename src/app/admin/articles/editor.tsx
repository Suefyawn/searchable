"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ImageUpload } from "@/components/image-upload";
import { OpenImagePicker } from "@/components/open-image-picker";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { saveArticle, type ArticleFormInput } from "./actions";

type Opt = { id: string; name: string; kind?: string };
type Related = { id: string; title: string; kind: string };
export type EditorInitial = Partial<Omit<ArticleFormInput, "intent">> & { status?: string; publishedAt?: string | null; scheduledFor?: string | null; slug?: string; previewUrl?: string; liveUrl?: string };

const WORKFLOW: { value: "draft" | "research" | "editing" | "fact_check"; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "research", label: "Research" },
  { value: "editing", label: "Editing" },
  { value: "fact_check", label: "Fact check" },
];

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ArticleEditor({ initial, categories, authors, cities, entities, related }: { initial: EditorInitial; categories: Opt[]; authors: Opt[]; cities: Opt[]; entities: { slug: string; name: string }[]; related: Related[] }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<ArticleFormInput["kind"]>(initial.kind ?? "news");
  const [body, setBody] = React.useState(initial.body ?? "");
  const [sources, setSources] = React.useState(initial.sources ?? []);
  const [faqs, setFaqs] = React.useState(initial.faqs ?? []);
  const [entitySlugs, setEntitySlugs] = React.useState<string[]>(initial.entitySlugs ?? []);
  const [tags, setTags] = React.useState<string[]>(initial.tags ?? []);
  const [tagDraft, setTagDraft] = React.useState("");
  const [relatedIds, setRelatedIds] = React.useState<string[]>(initial.relatedIds ?? []);
  const [relatedQuery, setRelatedQuery] = React.useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = React.useState(initial.featuredImageUrl ?? "");
  const [featuredImageCredit, setFeaturedImageCredit] = React.useState(initial.featuredImageCredit ?? "");
  const [featuredImageSourceUrl, setFeaturedImageSourceUrl] = React.useState(initial.featuredImageSourceUrl ?? "");
  const [featuredImageAlt, setFeaturedImageAlt] = React.useState(initial.featuredImageAlt ?? "");
  const [workflow, setWorkflow] = React.useState<"draft" | "research" | "editing" | "fact_check">(WORKFLOW.some((w) => w.value === initial.status) ? (initial.status as "draft") : "draft");
  const [scheduledFor, setScheduledFor] = React.useState(toLocalInput(initial.scheduledFor));
  const [busy, setBusy] = React.useState<null | ArticleFormInput["intent"]>(null);
  const [msg, setMsg] = React.useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const cats = categories.filter((c) => c.kind === kind);
  const isLive = initial.status === "published";
  const isScheduled = initial.status === "scheduled";

  React.useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  async function submit(intent: ArticleFormInput["intent"]) {
    const fd = new FormData(formRef.current!);
    const get = (k: string) => String(fd.get(k) ?? "");
    setBusy(intent);
    setMsg(null);
    const res = await saveArticle({
      id: initial.id,
      kind,
      title: get("title"),
      slug: get("slug") || undefined,
      dek: get("dek") || undefined,
      body,
      categoryId: get("categoryId") || undefined,
      authorId: get("authorId") || undefined,
      locationId: get("locationId") || undefined,
      featuredImageUrl: featuredImageUrl || undefined,
      featuredImageAlt: featuredImageAlt || undefined,
      featuredImageCredit: featuredImageCredit || undefined,
      featuredImageSourceUrl: featuredImageSourceUrl || undefined,
      seoTitle: get("seoTitle") || undefined,
      seoDescription: get("seoDescription") || undefined,
      canonicalUrl: get("canonicalUrl") || undefined,
      isFeatured: fd.get("isFeatured") === "on",
      noindex: fd.get("noindex") === "on",
      isSponsored: fd.get("isSponsored") === "on",
      contributorName: get("contributorName") || undefined,
      contributorBio: get("contributorBio") || undefined,
      sources: sources.filter((s) => s.title.trim()),
      faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
      entitySlugs,
      tags,
      relatedIds,
      workflow,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
      intent,
      note: get("note") || undefined,
    });
    setBusy(null);
    if (!res.ok) {
      setMsg({ tone: "err", text: res.error ?? "Could not save" });
      return;
    }
    setDirty(false);
    setMsg({ tone: "ok", text: { publish: "Published.", schedule: "Scheduled.", unpublish: "Unpublished, back to draft.", save: "Saved." }[intent] });
    if (!initial.id && res.id) router.replace(`/admin/articles/${res.id}`);
    else router.refresh();
  }

  function addTag(raw: string) {
    const t = raw.trim().replace(/,+$/, "");
    if (t && !tags.includes(t) && tags.length < 12) setTags([...tags, t]);
    setTagDraft("");
  }

  const relatedMatches = relatedQuery.trim().length >= 2 ? related.filter((r) => r.id !== initial.id && !relatedIds.includes(r.id) && r.title.toLowerCase().includes(relatedQuery.toLowerCase())).slice(0, 6) : [];

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} onChange={() => setDirty(true)} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Field label="Title" htmlFor="title">
          <Input id="title" name="title" defaultValue={initial.title} required className="h-12 text-lg font-medium" />
        </Field>
        <Field label="Dek (one-sentence summary: shows under the title and in cards)" htmlFor="dek">
          <Textarea id="dek" name="dek" defaultValue={initial.dek ?? ""} className="min-h-20" maxLength={400} />
        </Field>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="body" className="text-[13px] font-semibold">
              Body (Markdown)
            </label>
            <span className="text-xs text-3">
              {words} words · {Math.max(1, Math.round(words / 220))} min
            </span>
          </div>
          <Textarea
            id="body"
            name="body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setDirty(true);
            }}
            className="min-h-[28rem] font-mono text-[14px] leading-relaxed"
            placeholder={"## What happened\n\n...\n\n## What it means for you\n\n- ...\n\nLink to a tool: [Income Tax Calculator](/tools/tax/income-tax-calculator)"}
          />
          <p className="mt-1.5 text-xs text-3">Use ## for sections. Link at least one tool, guide, business category or topic. Internal links are relative: /tools/…, /guides/…, /businesses/…, /e/…</p>
        </div>

        <fieldset className="border border-line p-4">
          <legend className="px-1 text-[13px] font-semibold">Featured image</legend>
          <ImageUpload
            value={featuredImageUrl}
            onChange={(u) => {
              setFeaturedImageUrl(u);
              setDirty(true);
            }}
            variant="article"
            label="Upload featured image"
          />
          <OpenImagePicker
            className="mt-3"
            initialQuery={initial.title ?? ""}
            onPick={(img) => {
              setFeaturedImageUrl(img.url);
              setFeaturedImageCredit(img.credit);
              setFeaturedImageSourceUrl(img.sourceUrl);
              if (!featuredImageAlt) setFeaturedImageAlt(img.alt);
              setDirty(true);
            }}
          />
          <Input name="featuredImageAlt" value={featuredImageAlt} onChange={(e) => { setFeaturedImageAlt(e.target.value); setDirty(true); }} placeholder="Caption / alt text (shown under the image)" className="mt-3 h-9 text-sm" maxLength={300} />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Input value={featuredImageCredit} onChange={(e) => { setFeaturedImageCredit(e.target.value); setDirty(true); }} placeholder="Photo credit, e.g. Name / Wikimedia Commons, CC BY-SA 4.0" className="h-9 text-sm" maxLength={200} />
            <Input value={featuredImageSourceUrl} onChange={(e) => { setFeaturedImageSourceUrl(e.target.value); setDirty(true); }} placeholder="Source page URL (credit links here)" className="h-9 text-sm" maxLength={500} />
          </div>
        </fieldset>

        <fieldset className="border border-line p-4">
          <legend className="px-1 text-[13px] font-semibold">FAQs (rendered + FAQPage schema)</legend>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
                <Input placeholder="Question" value={f.question} onChange={(e) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
                <Input placeholder="Answer" value={f.answer} onChange={(e) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="sm" onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}>
              + Add FAQ
            </Button>
          </div>
        </fieldset>

        <fieldset className="border border-line p-4">
          <legend className="px-1 text-[13px] font-semibold">Sources</legend>
          <div className="space-y-3">
            {sources.map((s, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1.4fr_1.4fr_1fr_auto]">
                <Input placeholder="Title" value={s.title} onChange={(e) => setSources(sources.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <Input placeholder="URL" value={s.url ?? ""} onChange={(e) => setSources(sources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                <Input placeholder="Publisher" value={s.publisher ?? ""} onChange={(e) => setSources(sources.map((x, j) => (j === i ? { ...x, publisher: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="sm" onClick={() => setSources(sources.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setSources([...sources, { title: "", url: "", publisher: "" }])}>
              + Add source
            </Button>
          </div>
        </fieldset>

        <fieldset className="border border-line p-4">
          <legend className="px-1 text-[13px] font-semibold">Related articles (hand-picked; shown first)</legend>
          <ul className="mb-2 space-y-1 text-sm">
            {relatedIds.map((id) => {
              const r = related.find((x) => x.id === id);
              return (
                <li key={id} className="flex items-center justify-between gap-3">
                  <span>{r?.title ?? id}</span>
                  <button type="button" className="text-xs text-3 underline" onClick={() => setRelatedIds(relatedIds.filter((x) => x !== id))}>
                    remove
                  </button>
                </li>
              );
            })}
          </ul>
          <Input value={relatedQuery} onChange={(e) => setRelatedQuery(e.target.value)} placeholder="Search published articles…" className="h-9 text-sm" />
          {relatedMatches.length ? (
            <ul className="mt-1 border border-line bg-surface text-sm">
              {relatedMatches.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-1.5 text-left hover:bg-surface-2"
                    onClick={() => {
                      setRelatedIds([...relatedIds, r.id]);
                      setRelatedQuery("");
                    }}
                  >
                    <span className="mr-2 text-[10px] uppercase tracking-wider text-3">{r.kind}</span>
                    {r.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </fieldset>
      </div>

      <aside className="space-y-4 self-start lg:sticky lg:top-24">
        <div className="space-y-3 border border-line p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-2">Status</span>
            <span className={cn("font-medium", isLive ? "text-emerald-700" : isScheduled ? "text-amber-700" : "")}>
              {initial.status ?? "new"}
              {isScheduled && initial.scheduledFor ? ` · ${new Date(initial.scheduledFor).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}` : ""}
            </span>
          </div>
          {!isLive ? (
            <label className="block text-xs text-3">
              Workflow stage
              <Select value={workflow} onChange={(e) => setWorkflow(e.target.value as typeof workflow)} className="mt-1 h-9 text-sm">
                {WORKFLOW.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <div className="grid gap-2">
            <Button type="button" onClick={() => submit("publish")} disabled={!!busy}>
              {busy === "publish" ? "Publishing…" : isLive ? "Update & republish" : "Publish now"}
            </Button>
            <Button type="button" variant="outline" onClick={() => submit("save")} disabled={!!busy}>
              {busy === "save" ? "Saving…" : isLive ? "Save without republishing" : "Save"}
            </Button>
            {isLive ? (
              <Button type="button" variant="ghost" onClick={() => submit("unpublish")} disabled={!!busy}>
                Unpublish
              </Button>
            ) : null}
          </div>
          {!isLive ? (
            <div className="border-t border-line pt-3">
              <label className="block text-xs text-3">
                Schedule for
                <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="mt-1 h-9 text-sm" />
              </label>
              <Button type="button" variant="outline" size="sm" className="mt-2 w-full" onClick={() => submit("schedule")} disabled={!!busy || !scheduledFor}>
                {busy === "schedule" ? "Scheduling…" : isScheduled ? "Reschedule" : "Schedule"}
              </Button>
            </div>
          ) : null}
          <Input name="note" placeholder="Revision note (optional)" className="h-9 text-sm" />
          {msg ? <p className={cn("text-sm", msg.tone === "ok" ? "text-emerald-700" : "text-rose-700")}>{msg.text}</p> : null}
          {initial.previewUrl ? (
            <p className="text-xs">
              <Link href={initial.previewUrl} target="_blank" className="underline underline-offset-4">
                Preview draft ↗
              </Link>
              {initial.liveUrl && isLive ? (
                <>
                  {" · "}
                  <Link href={initial.liveUrl} target="_blank" className="underline underline-offset-4">
                    View live ↗
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="space-y-4 border border-line p-4">
          <Field label="Kind" htmlFor="kind">
            <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as ArticleFormInput["kind"])}>
              <option value="news">News</option>
              <option value="guide">Guide</option>
              <option value="explainer">Explainer</option>
              <option value="page">Page</option>
            </Select>
          </Field>
          <Field label="Category" htmlFor="categoryId">
            <Select id="categoryId" name="categoryId" defaultValue={initial.categoryId ?? ""}>
              <option value="">None</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Author" htmlFor="authorId">
            <Select id="authorId" name="authorId" defaultValue={initial.authorId ?? ""}>
              <option value="">None</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="City (local angle)" htmlFor="locationId">
            <Select id="locationId" name="locationId" defaultValue={initial.locationId ?? ""}>
              <option value="">, National, </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Slug" htmlFor="slug" help="Leave blank to generate from title. Changing a published slug needs a redirect.">
            <Input id="slug" name="slug" defaultValue={initial.slug ?? ""} className="font-mono text-sm" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" defaultChecked={!!initial.isFeatured} className="accent-brand-700" /> Feature on home / section
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="noindex" defaultChecked={!!initial.noindex} className="accent-brand-700" /> noindex (thin / temporary)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isSponsored" defaultChecked={!!initial.isSponsored} className="accent-brand-700" /> Sponsored (disclosure + rel=sponsored links)
          </label>
          <Field label="Guest contributor" help="Shown as the byline instead of a staff author; bio appears at the end.">
            <Input name="contributorName" defaultValue={initial.contributorName ?? ""} placeholder="Name, Company" className="h-9 text-sm" maxLength={120} />
            <Input name="contributorBio" defaultValue={initial.contributorBio ?? ""} placeholder="One-line bio (optional)" className="mt-2 h-9 text-sm" maxLength={300} />
          </Field>
        </div>

        <div className="border border-line p-4">
          <p className="mb-2 text-[13px] font-semibold">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 border border-line px-2 py-0.5 text-xs">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))} className="text-3 hover:text-[var(--text)]">
                  ×
                </button>
              </span>
            ))}
          </div>
          <Input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagDraft);
              }
            }}
            onBlur={() => tagDraft && addTag(tagDraft)}
            placeholder="Add tag, press Enter"
            className="mt-2 h-9 text-sm"
          />
        </div>

        <div className="border border-line p-4">
          <p className="mb-2 text-[13px] font-semibold">Topics (entities)</p>
          <div className="flex flex-wrap gap-1.5">
            {entities.map((e) => {
              const on = entitySlugs.includes(e.slug);
              return (
                <button key={e.slug} type="button" aria-pressed={on} onClick={() => setEntitySlugs(on ? entitySlugs.filter((s) => s !== e.slug) : [...entitySlugs, e.slug])} className={cn("border px-2 py-0.5 text-xs", on ? "border-ink-900 bg-ink-900 text-white dark:border-white dark:bg-white dark:text-ink-900" : "border-line text-2 hover:bg-surface-2 hover:text-[var(--text)]")}>
                  {e.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 border border-line p-4">
          <p className="text-[13px] font-semibold">SEO</p>
          <Field label="SEO title" htmlFor="seoTitle">
            <Input id="seoTitle" name="seoTitle" defaultValue={initial.seoTitle ?? ""} maxLength={120} className="h-9 text-sm" />
          </Field>
          <Field label="SEO description" htmlFor="seoDescription">
            <Textarea id="seoDescription" name="seoDescription" defaultValue={initial.seoDescription ?? ""} maxLength={200} className="min-h-16 text-sm" />
          </Field>
          <Field label="Canonical URL" htmlFor="canonicalUrl" help="Only if this page republishes content that lives elsewhere.">
            <Input id="canonicalUrl" name="canonicalUrl" defaultValue={initial.canonicalUrl ?? ""} className="h-9 font-mono text-sm" />
          </Field>
        </div>
      </aside>
    </form>
  );
}
