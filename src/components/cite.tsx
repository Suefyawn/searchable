import { formatDate } from "@/lib/format";
import { SITE } from "@/lib/utils";

/**
 * "Key facts" and "Cite this page" blocks. Written for people first, but shaped so search engines and language
 * models can lift a dated, attributed statement: short declarative lines, an explicit "as of" date, a stable URL.
 */
export function KeyFacts({ facts, asOf, className = "" }: { facts: { label: string; value: string }[]; asOf?: Date | string | null; className?: string }) {
  if (!facts.length) return null;
  return (
    <section className={`border-y-2 border-[var(--rule)] py-4 ${className}`} aria-label="Key facts">
      <p className="eyebrow">Key facts{asOf ? <span className="ml-2 font-sans text-[11px] font-normal normal-case tracking-normal text-3">as of {formatDate(asOf)}</span> : null}</p>
      <dl className="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label} className="flex justify-between gap-4 text-[15px]">
            <dt className="text-2">{f.label}</dt>
            <dd className="text-right font-medium tabular">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CiteThis({ title, path, date, markdownPath, className = "" }: { title: string; path: string; date?: Date | string | null; markdownPath?: string; className?: string }) {
  const url = `${SITE.url}${path}`;
  const when = formatDate(date ?? new Date());
  return (
    <aside className={`text-[13px] text-3 ${className}`} aria-label="How to cite">
      <p>
        <span className="font-medium text-2">Cite:</span> “{title}”, {SITE.name}, {when}, <a href={url} className="underline-offset-2 hover:underline">{url}</a>
        {markdownPath ? (
          <>
            {" "}
            · <a href={markdownPath} className="underline-offset-2 hover:underline" type="text/markdown">Markdown version</a>
          </>
        ) : null}
      </p>
    </aside>
  );
}
