import { marked, type Tokens } from "marked";

function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w؀-ۿ]+/g, "-")
    .replace(/^-|-$/g, "");
}

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    heading({ tokens, depth }: Tokens.Heading) {
      const text = this.parser.parseInline(tokens);
      const id = headingId(text);
      return `<h${depth} id="${id}">${text}</h${depth}>\n`;
    },
    // Tables scroll sideways on phones instead of wrapping "Rs 75,000" across two lines.
    table(token: Tokens.Table) {
      const cell = (c: Tokens.TableCell, tag: "th" | "td") => `<${tag}${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</${tag}>`;
      const head = `<thead><tr>${token.header.map((c) => cell(c, "th")).join("")}</tr></thead>`;
      const body = token.rows.length ? `<tbody>${token.rows.map((r) => `<tr>${r.map((c) => cell(c, "td")).join("")}</tr>`).join("")}</tbody>` : "";
      return `<div class="table-scroll"><table>${head}${body}</table></div>\n`;
    },
    link({ href, title, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href);
      const attrs = external ? ' target="_blank" rel="noopener"' : "";
      return `<a href="${href}"${title ? ` title="${title}"` : ""}${attrs}>${text}</a>`;
    },
  },
});

/** Server-side Markdown → HTML for trusted (editor-authored) content. */
export function renderMarkdown(md: string): string {
  return marked.parse(md ?? "", { async: false }) as string;
}

export type TocItem = { id: string; text: string; level: number };

/** Extract h2/h3 headings for a table of contents. Ids match the renderer above. */
export function extractToc(md: string): TocItem[] {
  const items: TocItem[] = [];
  for (const line of md.split("\n")) {
    const m = /^(##|###)\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[*_`]/g, "");
    items.push({ id: headingId(text), text, level: m[1].length });
  }
  return items;
}

/** First ~N chars of plain text for excerpts. */
export function plainText(md: string, max = 200): string {
  const t = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max).replace(/\s\S*$/, "") + "…" : t;
}
