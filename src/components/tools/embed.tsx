"use client";

import { useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui";
import { SITE } from "@/lib/utils";

/**
 * Embed mode: /tools/[category]/[slug]?embed=1 hides the site chrome and everything marked data-embed-hide,
 * leaving the calculator with a "Powered by" line. No separate route or layout needed, and the page stays static
 * because the flag is read on the client.
 */
export function EmbedMode({ toolName, toolPath }: { toolName: string; toolPath: string }) {
  const params = useSearchParams();
  if (params.get("embed") !== "1") return null;
  return (
    <>
      <style>{`body > header, body > footer, nav[aria-label="Breadcrumb"], [data-embed-hide] { display: none !important; } main { padding: 0 !important; } .container-x { padding-top: 12px !important; }`}</style>
      <p className="mt-4 border-t border-line pt-3 text-[13px] text-2">
        <a href={`${SITE.url}${toolPath}`} target="_blank" rel="noopener" className="font-medium underline underline-offset-4">
          {toolName}
        </a>{" "}
        by {SITE.name} — free calculators, guides and data for Pakistan.
      </p>
    </>
  );
}

/** "Embed this calculator" — an iframe snippet with a followed attribution link underneath (the backlink). */
export function EmbedSnippet({ toolName, toolPath }: { toolName: string; toolPath: string }) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const url = `${SITE.url}${toolPath}`;
  const code = `<iframe src="${url}?embed=1" title="${toolName}" width="100%" height="820" style="border:1px solid #e5e5e5;max-width:720px" loading="lazy"></iframe>\n<p style="font:13px system-ui">Calculator: <a href="${url}">${toolName}</a> by ${SITE.name}</p>`;
  return (
    <div data-embed-hide>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm font-medium underline-offset-4 hover:underline">
        {open ? "Hide embed code" : "Embed this calculator on your site"}
      </button>
      {open ? (
        <div className="mt-2 border border-line p-3">
          <p className="text-[13px] text-2">Paste this where you want the calculator. It stays up to date with our rates; keep the attribution line.</p>
          <textarea readOnly value={code} className="mt-2 h-28 w-full border border-line bg-surface-2 p-2 font-mono text-[12px]" onFocus={(e) => e.currentTarget.select()} />
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard blocked — the textarea is selectable */
              }
            }}
          >
            {copied ? "Copied" : "Copy code"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
