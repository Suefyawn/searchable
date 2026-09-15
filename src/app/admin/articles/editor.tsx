"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { saveArticle, type ArticleFormInput } from "./actions";

type Opt = { id: string; name: string; kind?: string };
export type EditorInitial = Partial<Omit<ArticleFormInput, "intent">> & { status?: string; publishedAt?: string | null; slug?: string };

export function ArticleEditor({ initial, categories, cities, entities }: { initial: EditorInitial; categories: Opt[]; cities: Opt[]; entities: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [kind, setKind] = React.useState<ArticleFormInput["kind"]>(initial.kind ?? "news");
  const [body, setBody] = React.useState(initial.body ?? "");
  const [sources, setSources] = React.useState(initial.sources ?? []);
  const [faqs, setFaqs] = React.useState(initial.faqs ?? []);
  const [entitySlugs, setEntitySlugs] = React.useState<string[]>(initial.entitySlugs ?? []);
  const [busy, setBusy] = React.useState<null | "save" | "publish" | "unpublish">(null);
  const [msg, setMsg] = React.useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const cats = categories.filter((c) => c.kind === kind);

  async function submit(intent: "save" | "publish" | "unpublish") {
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
      locationId: get("locationId") || undefined,
      featuredImageUrl: get("featuredImageUrl") || undefined,
      seoTitle: get("seoTitle") || undefined,
      seoDescription: get("seoDescription") || undefined,
      isFeatured: fd.get("isFeatured") === "on",
      noindex: fd.get("noindex") === "on",
      sources: sources.filter((s) => s.title.trim()),
      faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
      entitySlugs,
      intent,
      note: get("note") || undefined,
    });
    setBusy(null);
    if (!res.ok) {
      setMsg({ tone: "err", text: res.error ?? "Could not save" });
      return;
    }
    setMsg({ tone: "ok", text: intent === "publish" ? "Published." : intent === "unpublish" ? "Unpublished — back to draft." : "Saved." });
    if (!initial.id && res.id) router.replace(`/admin/articles/${res.id}`);
    else router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Field label="Title" htmlFor="title">
          <Input id="title" name="title" defaultValue={initial.title} required className="text-lg font-medium h-12" />
        </Field>
        <Field label="Dek (one-sentence summary — shows under the title and in cards)" htmlFor="dek">
          <Textarea id="dek" name="dek" defaultValue={initial.dek ?? ""} className="min-h-20" maxLength={400} />
        </Field>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="body" className="text-sm font-medium">
              Body (Markdown)
            </label>
            <span className="text-xs text-3">
              {words} words · {Math.max(1, Math.round(words / 220))} min
            </span>
          </div>
          <Textarea id="body" name="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[28rem] font-mono text-[14px] leading-relaxed" placeholder={"## What happened\n\n...\n\n## What it means for you\n\n- ...\n\nLink to a tool: [Income Tax Calculator](/tools/tax/income-tax-calculator)"} />
          <p className="mt-1.5 text-xs text-3">Use ## for sections. Link at least one tool, guide, business category or topic. Internal links are relative: /tools/…, /guides/…, /businesses/…, /e/…</p>
        </div>

        <fieldset className="surface p-4">
          <legend className="px-1 text-sm font-semibold">FAQs (rendered + FAQPage schema)</legend>
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

        <fieldset className="surface p-4">
          <legend className="px-1 text-sm font-semibold">Sources</legend>
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
      </div>

      <aside className="space-y-4 self-start lg:sticky lg:top-24">
        <div className="surface p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-2">Status</span>
            <span className={cn("font-medium", initial.status === "published" ? "text-emerald-700" : "")}>{initial.status ?? "new"}</span>
          </div>
          <div className="grid gap-2">
            <Button type="button" onClick={() => submit("publish")} disabled={!!busy}>
              {busy === "publish" ? "Publishing…" : initial.status === "published" ? "Update & republish" : "Publish"}
            </Button>
            <Button type="button" variant="outline" onClick={() => submit("save")} disabled={!!busy}>
              {busy === "save" ? "Saving…" : "Save draft"}
            </Button>
            {initial.status === "published" ? (
              <Button type="button" variant="ghost" onClick={() => submit("unpublish")} disabled={!!busy}>
                Unpublish
              </Button>
            ) : null}
          </div>
          <Input name="note" placeholder="Revision note (optional)" className="h-9 text-sm" />
          {msg ? <p className={cn("text-sm", msg.tone === "ok" ? "text-emerald-700" : "text-red-600")}>{msg.text}</p> : null}
        </div>

        <div className="surface p-4 space-y-4">
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
              <option value="">—</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="City (local angle)" htmlFor="locationId">
            <Select id="locationId" name="locationId" defaultValue={initial.locationId ?? ""}>
              <option value="">— National —</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Slug" htmlFor="slug" help="Leave blank to generate from title. Changing a published slug breaks links.">
            <Input id="slug" name="slug" defaultValue={initial.slug ?? ""} className="font-mono text-sm" />
          </Field>
          <Field label="Featured image URL" htmlFor="featuredImageUrl">
            <Input id="featuredImageUrl" name="featuredImageUrl" defaultValue={initial.featuredImageUrl ?? ""} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isFeatured" defaultChecked={!!initial.isFeatured} className="accent-brand-700" /> Feature on home / section
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="noindex" defaultChecked={!!initial.noindex} className="accent-brand-700" /> noindex (thin / temporary)
          </label>
        </div>

        <div className="surface p-4">
          <p className="mb-2 text-sm font-semibold">Topics (entities)</p>
          <div className="flex flex-wrap gap-1.5">
            {entities.map((e) => {
              const on = entitySlugs.includes(e.slug);
              return (
                <button key={e.slug} type="button" aria-pressed={on} onClick={() => setEntitySlugs(on ? entitySlugs.filter((s) => s !== e.slug) : [...entitySlugs, e.slug])} className={cn("rounded-full border px-2.5 py-0.5 text-xs", on ? "bg-ink-900 text-white dark:bg-white dark:text-ink-900" : "bg-surface-2 text-2 hover:bg-surface-3 hover:text-[var(--text)]")}>
                  {e.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="surface p-4 space-y-3">
          <p className="text-sm font-semibold">SEO overrides</p>
          <Field label="SEO title" htmlFor="seoTitle">
            <Input id="seoTitle" name="seoTitle" defaultValue={initial.seoTitle ?? ""} maxLength={120} className="h-9 text-sm" />
          </Field>
          <Field label="SEO description" htmlFor="seoDescription">
            <Textarea id="seoDescription" name="seoDescription" defaultValue={initial.seoDescription ?? ""} maxLength={200} className="min-h-16 text-sm" />
          </Field>
        </div>
      </aside>
    </form>
  );
}
